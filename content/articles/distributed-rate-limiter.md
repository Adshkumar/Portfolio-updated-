---
title: "Designing a Distributed Rate Limiter"
description: "Compare token buckets and sliding windows, then reason about shared state, atomic admission, failure policy, and operational safeguards."
slug: "distributed-rate-limiter"
date: "2026-10-25"
tags:
  - System Design
  - Distributed Systems
  - APIs
category: "System Design"
difficulty: "advanced"
published: true
featured: true
author: "Adarsh Kumar"
cover: null
---

A rate limiter decides whether a request is admitted based on a policy such as "at most 100 requests per minute per account." A single-process limiter is straightforward: keep counters in memory. A distributed service is harder because requests for the same account may reach different application instances, and those instances need a consistent way to evaluate the same quota.

Before choosing an algorithm, define the policy. Is the quota per user, API key, tenant, IP address, or route? Is it a strict maximum or a smoothed target? What should happen when the shared state store is unavailable? The answers affect both user experience and system safety.

## Token bucket as a mental model

A token bucket has a capacity and a refill rate. Tokens accumulate up to the capacity; each admitted request consumes one token. If no token is available, the request is rejected or delayed. The bucket allows short bursts up to its capacity while limiting the long-term average.

For example, a bucket with capacity 20 and refill rate 2 tokens per second can admit a burst of up to 20 requests after it has filled. It does not promise that every rolling one-second interval contains no more than two requests; the capacity explicitly permits bursts.

![Request flow through an API gateway to an atomic shared quota store and the application](/articles/images/rate-limiter-flow.svg "Distributed token-bucket request flow")

Figure 1: Each gateway asks the shared quota store to refill and consume a token atomically before forwarding a request. A denied request returns a rate-limit response without reaching the application.

The gateway identifies the quota key, for example `tenant:42:route:search`, and requests an atomic state transition. The store reads the current token balance and last-refill timestamp, calculates newly earned tokens, clamps the balance to capacity, and either subtracts one token or leaves state unchanged. The operation must be atomic: separate read and write operations could allow concurrent requests to consume the same last token.

This pure JavaScript function shows the token-bucket calculation; it is not itself a distributed implementation. A real service must run the read, calculation, and write as one atomic operation in its shared state store.

```js
function takeToken(bucket, { capacity, refillPerSecond }, nowMs) {
  const elapsedSeconds = Math.max(0, nowMs - bucket.updatedAt) / 1000;
  const refilled = Math.min(
    capacity,
    bucket.tokens + elapsedSeconds * refillPerSecond
  );
  const allowed = refilled >= 1;

  return {
    allowed,
    state: {
      tokens: allowed ? refilled - 1 : refilled,
      updatedAt: nowMs,
    },
  };
}
```

The function treats `bucket.tokens` as fractional, so an empty bucket can gradually accumulate capacity. Clamping elapsed time at zero prevents a backwards clock step from removing tokens. The state store should supply one consistent timestamp for the atomic operation, or the design must explicitly tolerate clock skew.

## Fixed and sliding windows

A fixed-window counter increments a key for a time bucket, such as minute 14:32, and rejects requests above a limit. It is simple and efficient, but traffic can cluster at a window boundary: a client might consume nearly the full limit just before the boundary and again just after.

A sliding-window log stores request timestamps and removes entries older than the rolling interval. It closely matches a strict rolling limit but stores more data and makes each decision more expensive. A sliding-window counter approximates the rolling count by combining the current and previous buckets; it uses less state at the cost of approximation.

Token buckets are useful when a controlled burst is acceptable. Sliding windows better express rolling quotas. A product policy should select the algorithm rather than choosing based only on implementation convenience.

## Distributed state and consistency

The shared state can live in a dedicated in-memory store, a database, or a gateway-provided rate-limit service. For every option, document the scope of atomicity, persistence, replication, expiry, and failover. A replica that is behind may temporarily allow excess traffic or reject valid requests, depending on where decisions are made.

An atomic script or transaction in the state store can combine refill and consume. Store state with an expiry long enough to cover the bucket's useful lifetime, and validate that the key space cannot grow without bound. If quotas are per untrusted identifier, normalize identifiers and protect the service against attackers creating many distinct keys.

## Failure policy is part of the quota

When the state store times out, there are two broad choices:

- **Fail open:** allow the request. This preserves availability for legitimate users but can remove protection during a dependency failure.
- **Fail closed:** reject or defer the request. This protects a scarce downstream service but can turn the limiter outage into a broad user-facing outage.

There is no universal default. A low-risk read endpoint may fail open with a local emergency cap; a sensitive operation or expensive endpoint may fail closed. Use bounded timeouts, circuit breaking, and explicit metrics so a failed shared store does not cause each gateway to queue unlimited work.

## Response and operational contract

For HTTP APIs, a rejected request commonly receives `429 Too Many Requests`. A response can include `Retry-After` when the service can estimate when capacity will be available. Avoid exposing sensitive internal quota keys. Communicate whether limits are per account, per token, or global.

Monitor admitted and rejected requests by policy and route, store latency and errors, key cardinality, and fail-open decisions. Do not use raw user identifiers as metric labels; unbounded label cardinality can overwhelm the monitoring system. Sample or aggregate diagnostics where necessary.

For fairness, separate global protection from customer quotas. A global concurrency limit can protect a database from overload even when individual tenants are below their own limits. This admission-control boundary complements, rather than replaces, per-tenant rate limits.

## Choosing a design

Start with the semantics: burst allowance, interval, identity, and failure behavior. Then estimate the request rate to the quota store and the cost of one atomic decision. If a single global key becomes hot, partition policies only when the resulting quota semantics remain acceptable; sharding a strict global counter can otherwise permit a larger aggregate burst.

The token-bucket flow described here can implement an approximate distributed policy when the shared store provides atomic updates and the configured time source is sufficiently consistent for the intended tolerance. It is not a substitute for a workload limit, concurrency cap, or abuse detection system.

### Key takeaways

- Define identity, interval, burst, and failure behavior before selecting an algorithm.
- Token buckets smooth average rates while allowing explicit bursts.
- A shared distributed decision needs atomic state transitions to avoid concurrent over-admission.
- Fail-open and fail-closed behavior encode different availability and protection priorities.
- Monitor the limiter itself, especially store latency, rejection rates, and failover behavior.

## References

- [IETF RFC 6585: Additional HTTP Status Codes](https://www.rfc-editor.org/rfc/rfc6585)
- [Redis: Rate limiter patterns](https://redis.io/docs/latest/develop/use/patterns/rate-limiter/)
- [Envoy: Global rate limiting](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/other_features/global_rate_limiting)
