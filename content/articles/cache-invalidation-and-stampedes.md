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

A cache keeps a copy of data closer to the code that needs it. That copy is useful only while its freshness and failure behavior are acceptable. The difficult question is rarely how to read a cache; it is how to make sure old values do not mislead users, and how to prevent a burst of misses from overwhelming the source database.

This article uses a cache-aside design: the application checks the cache first and loads from the database on a miss. It is an illustrative pattern, not a claim about a specific production system.

## The basic read and update paths

On a read, the application looks up a key. A hit returns the cached value. A miss loads the authoritative value from the database and fills the cache. On a write, the application commits the database change and then invalidates the corresponding cached key.

![Cache-aside read and update paths between application, cache, and database](/articles/images/cache-invalidation-flow.svg "Cache-aside data flow and stale-read boundary")

Figure 1: Reads consult the cache before the database. Writes commit to the database and invalidate the cache key. If invalidation is delayed or lost, a read can temporarily observe a stale cached value.

The order of a write matters. Invalidating first and then failing the database transaction causes a later cache miss to reload the old value, which is usually safe but wastes work. Committing the database first and then failing to invalidate can leave stale data visible until expiry. A short time-to-live (TTL) bounds some stale windows, but a TTL is not an immediate consistency guarantee.

## Choosing an invalidation strategy

Common strategies have different operational consequences:

- **TTL only:** entries expire after a fixed duration. It is simple and self-healing, but reads can be stale for up to the TTL.
- **Write invalidation:** after a successful database write, delete or replace affected cache entries. It can make changes visible sooner, but failures between the database commit and invalidation must be handled.
- **Event-driven invalidation:** publish a change event and let cache consumers invalidate their local copies. This supports multiple caches, but delivery is usually asynchronous and consumers need replay and deduplication.

If the database commit and event publication must not diverge, a transactional outbox can record the event in the same local database transaction. A background publisher retries delivery. This prevents the classic "database commit succeeded but process died before publishing" gap, but consumers still need idempotent handling and there can still be a delay before invalidation.

## Stampedes and synchronized expiry

A cache stampede happens when many requests miss the same popular key at once and all fetch it from the database. Synchronized expiry makes this more likely: keys created together may expire together, triggering a burst of identical queries.

Mitigations include:

- **Request coalescing:** share one in-flight load among callers within a process.
- **Distributed single-flight:** coordinate one loader across instances, while ensuring lock expiry and failure recovery are safe.
- **TTL jitter:** vary expiration times so a batch of entries does not all expire together.
- **Stale-while-revalidate:** serve a known-stale value for a bounded window while one worker refreshes it.
- **Concurrency limits:** cap refresh work and reject or defer excess load rather than queueing without bound.

Stale-while-revalidate deliberately trades freshness for availability and lower latency. It is inappropriate for values whose stale use can cause a safety, financial, or authorization error unless the domain explicitly permits that behavior.

## Failure behavior

If the cache is unavailable, a fallback to the database may preserve correct reads but can overload the database. Use bounded timeouts, connection pools, concurrency limits, and circuit breakers. A fallback is a second traffic path that needs a capacity plan, not a free reliability improvement.

If the database is unavailable but a cache value exists, serving stale data may help some read-only experiences. The service should make this choice per data type and communicate when freshness is uncertain. Do not let a cache silently become the only durable copy of data unless it was designed for that purpose.

For correctness-sensitive decisions, consider whether the cache can be bypassed or whether a version, validation timestamp, or direct authoritative read is required. Cache keys must include all dimensions that affect the result, such as tenant, locale, permissions, or schema version. Omitting a dimension can return another context's data, which is both a correctness and privacy problem.

## What to observe

Track hit and miss rates by cache and operation, backend latency, refresh failures, eviction rates, stale responses, and the number of coalesced waiters. A high hit ratio alone does not prove success: it can hide stale data or excessive latency on the remaining misses.

Test simultaneous misses, invalidation failure after a database commit, cache restart, hot-key expiry, and source-database slowdown. Verify the effect on both data freshness and backend load.

### Key takeaways

- Cache policy is a consistency decision: document how stale a value may be.
- Database commit and cache invalidation are separate failure points unless explicitly coordinated.
- Stampede controls limit duplicate refresh work but introduce their own timeout and recovery behavior.
- A cache outage can shift load to the database; bound the fallback path.
- Include tenant and authorization context in cache keys where those dimensions affect data access.

## References

- [AWS Builders' Library: Caching challenges and strategies](https://aws.amazon.com/builders-library/caching-challenges-and-strategies/)
- [Redis: Cache-aside pattern](https://redis.io/docs/latest/develop/use/patterns/)
- [Martin Kleppmann: Designing Data-Intensive Applications](https://dataintensive.net/)
