---
title: "Cache Invalidation, Stale Reads, and Cache Stampedes"
description: "Understand cache-aside behavior, stale data windows, stampede control, and how to recover when the cache or source of truth fails."
slug: "cache-invalidation-and-stampedes"
date: "2026-10-25"
tags:
  - Databases
  - Caching
  - Reliability
category: "Databases"
difficulty: "advanced"
published: true
featured: false
author: "Adarsh Kumar"
cover: null
---

Caching is an optimization that exchanges memory and data consistency for lower read latency and reduced backend database load. When implemented correctly, caching protects databases from high-throughput reads. When implemented carelessly, caching introduces severe distributed systems failures: silent data divergence, stale reads, security leaks across tenants, and **cache stampedes** that bring down production database clusters during traffic spikes.

To operate caches reliably at scale, engineers must master the trade-offs between caching topologies, invalidation race conditions, stampede mitigation algorithms, and resilient failure modes.

![Cache-aside read and update paths between application, cache, and database](/articles/images/cache-invalidation-flow.svg "Cache-aside data flow and stale-read boundary")

Figure 1: Complete request and mutation lifecycle in a Cache-Aside architecture. Reads query the cache first, falling back to the database on a miss to populate the key. Writes commit to the database first, then invalidate (delete) the cache entry. If the invalidation step fails, drops, or lags, a dangerous stale-read window opens where clients observe obsolete data.

## Caching topologies: Architectural comparison

Before writing caching code, understand how data flows between application, cache, and persistent storage:

```text
[ Cache-Aside ]   App ──> Cache (Miss) ──> DB ──(Fill)──> Cache
[ Read-Through ]  App ──> [ Cache Layer ] ──(On Miss)──> DB
[ Write-Through ] App ──> [ Cache Layer ] ──(Sync Write)─> DB
[ Write-Behind ]  App ──> Cache ──(Async Batch Queue)───> DB
```

| Topology | Read Path | Write Path | Consistency Guarantee | Primary Failure Risk |
| --- | --- | --- | --- | --- |
| **Cache-Aside (Lazy Loading)** | App reads Cache; on miss, reads DB and fills Cache | App writes DB, then deletes key in Cache | Eventual consistency; stale window bounded by TTL or invalidation latency | Dual-write invalidation race condition; cache stampedes on miss |
| **Read-Through / Write-Through** | App treats Cache as single store; Cache fetches from DB on miss | App writes to Cache; Cache synchronously writes to DB before acknowledging | High consistency between Cache and DB | Higher write latency; both Cache and DB must be available synchronously |
| **Write-Behind (Write-Back)** | App reads Cache | App writes to Cache; Cache asynchronously flushes batch writes to DB | Eventual consistency; low write latency | Data loss: unwritten dirty cache records are permanently lost if cache node crashes |
| **Refresh-Ahead** | App reads Cache; Cache automatically reloads key before TTL expires | App writes DB and invalidates Cache | High read performance for predictable hot access patterns | Wasted compute/memory if predictive access models refresh unused keys |

For distributed microservices, **Cache-Aside** is the dominant pattern because it avoids tight operational coupling and supports heterogeneous database engines.

## The invalidation vs. update paradox: Concurrency races

When updating an entity in the database, should the application **update the cached value** or **delete (invalidate) the cache key**?

### Why updating the cache on write is an anti-pattern
Updating the cache directly causes catastrophic silent data corruption due to out-of-order execution across concurrent threads:

| Step | Thread 1 (Write A) | Thread 2 (Write B) | Database State | Cache State |
| --- | --- | --- | --- | --- |
| T1 | Writes row to DB (`val = A`) | - | `val = A` | - |
| T2 | - | Writes row to DB (`val = B`) | `val = B` | - |
| T3 | - | Sets Cache (`val = B`) | `val = B` | `val = B` |
| T4 | Sets Cache (`val = A`) (delayed) | - | `val = B` | **`val = A` (STALE FOREVER)** |

At step T4, Thread 1's delayed cache update overwrites Thread 2's newer value. The database holds authoritative value `B`, but the cache holds stale value `A` indefinitely until its TTL expires.

### The Rule: Always invalidate (delete) the cache key on write
Instead of updating the value, delete the cache key:

```text
Write to Database ──(Commit Succeeded)──> DELETE cache_key
```

If two writes race to delete the cache key, the order does not matter: both issue `DEL cache_key`. The next subsequent read will safely fetch the authoritative state from the database and populate the cache with latest data.

### The dual-write failure mode and CDC remediation
Even with cache deletion, a dual-write failure can occur:
1. Application commits the database transaction successfully.
2. The application process crashes, or the network to Redis drops, before the `DEL cache_key` command is executed.
3. The cache now holds obsolete data until the TTL expires.

**Production Solution: Change Data Capture (CDC) Invalidation**
To decouple cache invalidation from application process lifecycles:
- The database writes changes to its write-ahead log (WAL).
- A CDC engine (such as Debezium or PostgreSQL logical replication) reads the WAL commit stream.
- An asynchronous worker consumes commit events from a Kafka topic and issues `DEL` commands to Redis.
- If an invalidation worker crashes, it resumes from its Kafka offset, guaranteeing that every committed database mutation results in a cache invalidation.

## The cache stampede (Thundering herd)

A **cache stampede** occurs when a highly accessed, expensive key expires or is invalidated while receiving massive traffic (e.g., 20,000 QPS for an e-commerce homepage catalog).

```text
Normal:
20,000 QPS ──> [ Cache Hit ] ──> Fast (<1ms)

Key Expires at T:
20,000 QPS ──> [ Cache Miss ] ──> DB Overload!
```

Within milliseconds, thousands of identical database queries overwhelm the database connection pool, driving CPU to 100% and triggering cascading outages across dependent services.

### Mitigation 1: Distributed Mutex (Locking)
When a cache miss occurs, the worker does not query the database immediately. Instead, it attempts to acquire a short-lived distributed mutex in Redis:

```text
Cache Miss ──> Try SET lock:key NX PX 5000
    ├── Acquired ──> Query DB & Update Cache
    └── Failed   ──> Sleep 50ms & Retry Read
```

Only one thread queries the database; all other concurrent requests wait briefly and read the freshly computed value from cache.

### Mitigation 2: In-Process Request Coalescing (Singleflight)
When multiple requests hit the *same* application pod simultaneously, they should not all spawn separate Redis or database queries.

Using the **Singleflight** pattern (native in Go's `sync/singleflight` or implemented via memoized Promises in Node.js), multiple concurrent callers within the process share a single in-flight execution:

```js
// In-process singleflight / promise coalescing
class SingleFlight {
  constructor() {
    this.inFlight = new Map();
  }

  async do(key, fn) {
    if (this.inFlight.has(key)) {
      // Re-use existing in-flight Promise without duplicate execution
      return this.inFlight.get(key);
    }

    const promise = fn().finally(() => {
      this.inFlight.delete(key);
    });

    this.inFlight.set(key, promise);
    return promise;
  }
}
```

### Mitigation 3: Probabilistic Early Expiration (The XFetch Algorithm)
The mathematically optimal solution to cache stampedes is **probabilistic early recomputation** (the XFetch algorithm, published by Vattani et al.).

Instead of waiting for the key to expire, a read query computes a probability function to decide whether to recompute the value in the background *before* it expires:

```text
delta * beta * ln(random()) > time_to_expire
```

Where:
- `delta`: Delta time required to compute the value from the database (in seconds).
- `beta`: Tuning aggressiveness multiplier (`beta > 0`, typically 1.0).
- `random()`: Uniform random value between 0 and 1.
- `time_to_expire`: `expiry_timestamp - current_time`.

```js
function shouldRecomputeEarly(expiryTimeMs, computeDurationMs, beta = 1.0) {
  const now = Date.now();
  const timeToExpireMs = expiryTimeMs - now;
  if (timeToExpireMs <= 0) return true; // Already expired

  // XFetch probabilistic calculation
  const p = -computeDurationMs * beta * Math.log(Math.random());
  return p >= timeToExpireMs;
}
```

As the key approaches its expiration time, the probability that a reader triggers an asynchronous background refresh smoothly increases toward 100%. The key is refreshed seamlessly before expiry, completely eliminating cache stampedes with zero client-visible latency spikes.

## Cache penetration, avalanche, and breakdown

Three classic systemic caching failure modes require explicit architectural defenses:

```text
1. Cache Penetration:
   Non-existent IDs bypass cache to hit DB.

2. Cache Avalanche:
   Massive simultaneous expirations flood DB.

3. Cache Breakdown:
   A single ultra-hot key expires under load.
```

### 1. Defeating Cache Penetration
Attackers or buggy clients repeatedly query non-existent keys (e.g., `GET /user/-999999` or random UUIDs). Because the keys never exist in the database, the cache never stores them, and every request hits the database directly.
- **Defense A: Cache Null / Empty Values**: When the database returns `NOT_FOUND`, store a null sentinel object in the cache with a short TTL (e.g., 30 to 60 seconds):
  `SET user:-999999 "NULL" EX 30`
- **Defense B: Bloom Filter Gate**: Keep an in-memory Bloom filter of all valid entity IDs in front of the cache. If the Bloom filter returns `false`, reject or return 404 immediately without consulting Redis or the database.

### 2. Defeating Cache Avalanche
When thousands of keys are written at the same time (e.g., daily midnight catalog batch ingest) with a fixed 1-hour TTL, all thousands of keys expire at the exact same second (`01:00:00`), flooding the database.
- **Defense: Uniform Random TTL Jitter**:
  Always add randomized jitter to base expiration times:

```text
TTL_effective = TTL_base + random(0, jitter_window)
```

For example:
- Base TTL: 3600 seconds (1 hour)
- Jitter: `random(0, 300)` seconds (up to 5 minutes)
- Effective TTL: 3600 to 3900 seconds

Expirations are evenly distributed across time, creating a smooth, flat refresh curve.

## Multi-tenant namespacing and security boundaries

In multi-tenant SaaS environments, sharing a single Redis instance without strict key isolation causes catastrophic data leaks:
- Never use raw IDs as cache keys: `GET record:1024` can return Tenant B's confidential financial record to Tenant A.
- **Mandatory compound key structure**:
  `{environment}:{tenant_id}:{resource_type}:{entity_id}`
  Example: `prod:tenant_894a:invoices:inv_1024`
- Hash sensitive keys when storing personally identifiable information (PII) or user session tokens to prevent plain-text credential leaks during Redis operational dumps (`redis-cli MONITOR` or RDB backups).

### Key takeaways

- Cache-Aside is the standard distributed caching pattern; always delete (invalidate) keys on database writes rather than updating them.
- Avoid dual-write invalidation gaps by combining write-time deletion with Change Data Capture (CDC) streams from the database WAL.
- Mitigate cache stampedes using distributed locks, singleflight request coalescing, or the probabilistic XFetch early-expiration algorithm.
- Prevent cache penetration by storing short-lived null sentinels or querying Bloom filters.
- Defeat cache avalanches by applying uniform random jitter to all TTL expiration windows.

## References

- [Vattani, Chierichetti, Lowenstein: Optimal Probabilistic Cache Invalidation (XFetch Algorithm)](https://www.vldb.org/pvldb/vol8/p886-vattani.pdf)
- [AWS Builders' Library: Caching Challenges and Strategies](https://aws.amazon.com/builders-library/caching-challenges-and-strategies/)
- [Redis Documentation: Distributed Locks with Redlock](https://redis.io/docs/latest/develop/use/patterns/distributed-locks/)
- [Martin Kleppmann: Designing Data-Intensive Applications, Chapter 11: Stream Processing](https://dataintensive.net/)
- [Debezium Documentation: Architecture and Change Data Capture Patterns](https://debezium.io/documentation/reference/stable/architecture.html)
