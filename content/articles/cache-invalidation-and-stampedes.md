---
title: "Cache Invalidation, Stale Reads, and Cache Stampedes"
description: "Understand cache-aside behavior, stale data windows, stampede control, and how to recover when the cache or source of truth fails."
slug: "cache-invalidation-and-stampedes"
date: "2026-10-25"
updated: "2026-11-02"
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

Caching stores a temporary copy of data so repeated reads can be served with less latency or source-database work. The trade-off is that cached values can be stale and add another failure and capacity boundary. A cache helps only when its hit rate, freshness requirements, and operational cost make the added complexity worthwhile.

![Cache-aside read and update paths between application, cache, and database](/articles/images/cache-invalidation-flow.svg "Cache-aside data flow and stale-read boundary")

Figure 1: In cache-aside, the application reads the cache and fills it from the source on a miss. A write commonly commits to the source and then invalidates the cache, but this is not an atomic operation: failures and concurrent reads can leave a stale value until it expires or is invalidated again.

## The idea in plain language

A cache is a faster, temporary copy of data whose source of truth lives somewhere else. For example, a product page may be read thousands of times while its price changes only occasionally. Keeping the page data in a cache can reduce repeated database work, but the application now has to decide how long a copy is trusted and how it is refreshed after a change.

In the common cache-aside pattern, the application checks the cache first, reads the database on a miss, and stores the result for later. On a write, deleting the old cache entry is often a safer default than trying to keep two independent copies perfectly synchronized. It is not a universal rule: the right policy depends on consistency needs, data ownership, and how failures are handled.

Caching is most useful when data is read repeatedly and a bounded stale window is acceptable. If every request is unique, or stale data is unsafe, a cache may add complexity without enough benefit.

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
| **Cache-Aside (Lazy Loading)** | App reads Cache; on miss, reads DB and fills Cache | App writes DB, then deletes key in Cache | Freshness depends on invalidation, races, and TTL | Dual-write invalidation gaps; stampedes on miss |
| **Read-Through / Write-Through** | Cache fetches from the source on a miss | Cache forwards writes to the source synchronously | Depends on the cache/source contract; it is not automatically strongly consistent | Higher write latency and coupling to both systems |
| **Write-Behind (Write-Back)** | App reads Cache | App writes to Cache; Cache asynchronously flushes batch writes to DB | Eventual consistency; low write latency | Recent writes can be lost if they are not durably replicated before a cache failure |
| **Refresh-Ahead** | Cache refreshes a likely-hot key before expiry | App writes DB and invalidates Cache | Can reduce miss latency for predictable hot keys | Refresh work can be wasted or fail; freshness still needs a policy |

Cache-aside is a common pattern because the application controls cache behavior and can use many cache and database products. It still requires explicit decisions about staleness, invalidation, and failure handling.

## The invalidation vs. update paradox: Concurrency races

When updating an entity in the database, should the application **update the cached value** or **delete (invalidate) the cache key**?

### Why updating the cache on write can be risky
Updating the cache directly causes catastrophic silent data corruption due to out-of-order execution across concurrent threads:

| Step | Thread 1 (Write A) | Thread 2 (Write B) | Database State | Cache State |
| --- | --- | --- | --- | --- |
| T1 | Writes row to DB (`val = A`) | - | `val = A` | - |
| T2 | - | Writes row to DB (`val = B`) | `val = B` | - |
| T3 | - | Sets Cache (`val = B`) | `val = B` | `val = B` |
| T4 | Sets Cache (`val = A`) (delayed) | - | `val = B` | **`val = A` (STALE)** |

At step T4, Thread 1's delayed cache update overwrites Thread 2's newer value. The database holds `B`, while the cache holds stale `A` until another update, invalidation, or expiration corrects it. A finite TTL bounds this example's stale period only if the expiration is reliably enforced.

### A common safe default: invalidate (delete) the cache key on write
Instead of updating the value, delete the cache key:

```text
Write to Database ──(Commit Succeeded)──> DELETE cache_key
```

Deleting after a committed write is often safer than writing a value computed earlier, but deletion alone does not eliminate every race. For example, a reader can fetch old value `A`, a writer can commit `B` and delete the key, then the reader can populate the now-empty cache with `A`. A finite TTL limits that stale entry; stronger freshness may need version checks, write/read coordination, or a cache design with stronger consistency.

### The dual-write failure mode and CDC remediation
Even with cache deletion, a dual-write failure can occur:
1. Application commits the database transaction successfully.
2. The application process crashes, or the network to Redis drops, before the `DEL cache_key` command is executed.
3. The cache now holds obsolete data until the TTL expires.

**One option: Change Data Capture (CDC) invalidation**
To decouple cache invalidation from application process lifecycles:
- The database writes changes to its write-ahead log (WAL).
- A CDC engine (such as Debezium or PostgreSQL logical replication) reads the WAL commit stream.
- An asynchronous worker consumes commit events from a Kafka topic and issues `DEL` commands to Redis.
- A durable change stream and retrying consumer can recover from worker failures, but invalidation is asynchronous and may be delayed or repeated. Design consumers to be idempotent, monitor lag, and retain a TTL or reconciliation path for missed or reordered events. CDC narrows the application-crash gap; it does not make the database and cache one atomic transaction.

## The cache stampede (Thundering herd)

A **cache stampede** occurs when a highly accessed, expensive key expires or is invalidated and many requests miss together. For example, a hot catalog key receiving 20,000 requests per second could send a burst of duplicate work to the source if requests are not coalesced.

```text
Normal:
20,000 QPS ──> [ Cache Hit ] ──> Fast (<1ms)

Key Expires at T:
20,000 QPS ──> [ Cache Miss ] ──> DB Overload!
```

If the source cannot absorb the resulting burst, duplicate queries can exhaust its connection pool or increase latency and trigger downstream failures. The impact depends on the source's capacity and the application's miss behavior.

### Mitigation 1: Distributed Mutex (Locking)
When a cache miss occurs, the worker does not query the database immediately. Instead, it attempts to acquire a short-lived distributed mutex in Redis:

```text
Cache Miss ──> Try SET lock:key NX PX 5000
    ├── Acquired ──> Query DB & Update Cache
    └── Failed   ──> Sleep 50ms & Retry Read
```

If the lock remains valid and all contenders follow the same protocol, one worker can refresh the key while others wait or serve stale data. A lock lease can expire while its owner is still working, so use ownership tokens when releasing locks and do not treat a distributed lock as a substitute for bounded waits, timeouts, or stale-value policy.

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
The XFetch paper describes a probabilistic early-recomputation strategy under a particular cache model. It is one option, not a universal optimum or a replacement for request coalescing when duplicate refreshes are too costly.

Instead of waiting for the key to expire, a read query computes a probability function to decide whether to recompute the value in the background *before* it expires:

```text
-delta * beta * ln(random()) >= time_to_expire
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
  const earlyRefreshOffsetMs =
    -computeDurationMs * beta * Math.log(Math.random());
  return earlyRefreshOffsetMs >= timeToExpireMs;
}
```

As the key approaches expiry, the chance that a reader triggers an early refresh increases. This can reduce simultaneous expiration, but multiple readers may still refresh concurrently. Use request coalescing or coordination if duplicate work is unacceptable, and define what readers do if refresh fails.

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
- **Defense B: Bloom filter**: A Bloom filter can cheaply screen likely-missing keys because it has false positives but, when correctly maintained, no false negatives. If updates can lag or entries can be evicted, do not use a stale filter as an authoritative reason to reject a newly created resource; fall back to the source or refresh the filter.

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

Randomized expirations spread load statistically; they do not guarantee an even arrival rate, especially for a small number of hot keys.

## Multi-tenant namespacing and security boundaries

In multi-tenant SaaS environments, sharing a single Redis instance without strict key isolation causes catastrophic data leaks:
- Never use raw IDs as cache keys: `GET record:1024` can return Tenant B's confidential financial record to Tenant A.
- **Mandatory compound key structure**:
  `{environment}:{tenant_id}:{resource_type}:{entity_id}`
  Example: `prod:tenant_894a:invoices:inv_1024`
- Avoid placing secrets or unnecessary personal data in cache keys: keys may appear in logs, monitoring output, or backups. Hashing a key can reduce direct exposure, but it does not replace access controls or encryption for cached values.

### Key takeaways

- Cache-Aside is a common distributed caching pattern; invalidating a key after a database write is often a safer default than independently updating both copies.
- Reduce invalidation gaps with durable change events or an outbox/CDC design, while accounting for asynchronous lag, retries, and stale-read windows.
- Mitigate cache stampedes using distributed locks, singleflight request coalescing, or the probabilistic XFetch early-expiration algorithm.
- Prevent cache penetration by storing short-lived null sentinels or querying Bloom filters.
- Defeat cache avalanches by applying uniform random jitter to all TTL expiration windows.

## References

- [Vattani, Chierichetti, Lowenstein: Optimal Probabilistic Cache Invalidation (XFetch Algorithm)](https://www.vldb.org/pvldb/vol8/p886-vattani.pdf)
- [AWS Builders' Library: Caching Challenges and Strategies](https://aws.amazon.com/builders-library/caching-challenges-and-strategies/)
- [Redis Documentation: Distributed Locks with Redlock](https://redis.io/docs/latest/develop/use/patterns/distributed-locks/)
- [Martin Kleppmann: Designing Data-Intensive Applications, Chapter 11: Stream Processing](https://dataintensive.net/)
- [Debezium Documentation: Architecture and Change Data Capture Patterns](https://debezium.io/documentation/reference/stable/architecture.html)
