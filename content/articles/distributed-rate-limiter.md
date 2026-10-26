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

Rate limiting is an admission-control boundary that protects backend services from degradation, resource starvation, cascading failures, and distributed denial-of-service (DDoS) traffic. In a single-process service, rate limiting is trivial: track counters or timestamps in local memory mutexes. In a distributed architecture with dozens of API gateways and autoscaling application pods across multiple availability zones, rate limiting becomes a complex distributed state problem.

Every distributed rate limiter must satisfy strict non-functional constraints:
- **Ultra-low latency impact**: Evaluation must complete within 1–2 ms, adding negligible overhead to the critical request path.
- **Atomic state transitions**: Concurrent requests racing from different gateway instances must not bypass quotas (over-admission) or corrupt counter state.
- **Fault resilience**: If the central quota store experiences latency spikes or network partitions, the rate limiter must degrade predictably rather than taking down the entire API gateway fleet.

![Request flow through an API gateway to an atomic shared quota store and the application](/articles/images/rate-limiter-flow.svg "Distributed token-bucket request flow")

Figure 1: Request admission flow in a distributed API gateway topology. The gateway extracts the client identity, computes the quota key, and executes an atomic state evaluation in a shared low-latency store (such as Redis). Admitted requests pass to backend services, while denied requests terminate at the gateway with an immediate `HTTP 429 Too Many Requests` response.

## Algorithmic foundations and trade-offs

Before writing distributed code, you must match the business policy to the correct rate-limiting algorithm.

```text
Incoming Traffic (Bursts)
       │
       ▼
[ Algorithm / Policy Engine ]
       │
       ├── Allowed ──> Forward to Application
       └── Denied  ──> Return HTTP 429 Too Many Requests
```

### 1. Token Bucket
- **Mental model**: A bucket holds at most `C` tokens. Tokens refill continuously at a rate of `r` tokens per second. Each admitted request consumes `k` tokens (typically `k = 1`). If insufficient tokens are present, the request is rejected.
- **Key property**: Naturally accommodates short, controlled bursts up to bucket capacity `C`, while strictly bounding long-term sustained throughput to `r`.
- **State required**: Only two values: `tokens` (floating-point balance) and `last_updated_at` (epoch timestamp).

### 2. Leaky Bucket (Traffic Shaper vs. Traffic Meter)
- **As a FIFO queue (Traffic Shaper)**: Requests enter a bounded FIFO queue and leak out at a constant, fixed rate to downstream handlers. Bursts are smoothed into a uniform stream. If the queue overflows, incoming requests are dropped.
- **As a counter (Traffic Meter / Generic Cell Rate Algorithm - GCRA)**: Measures inter-arrival times using a virtual theoretical arrival time.
- **Key property**: Enforces a strict, steady departure rate with zero burst tolerance. High burst latency because excess requests wait in the queue.

### 3. Fixed Window Counter
- **Mental model**: Divides time into fixed intervals (e.g., 1 minute). A counter increments per window. If counter > limit, requests are rejected. Resets at the boundary.
- **Fatal boundary flaw**: A client can send 100% of its quota at the last second of Window 1 (e.g., 00:59) and another 100% at the first second of Window 2 (e.g., 01:00), effectively bursting at **2x the configured rate** across a 2-second rolling boundary.

### 4. Sliding Window Log
- **Mental model**: Maintains a sorted set of timestamps for every admitted request. On each request, entries older than `(t - window)` are pruned, the set size is evaluated, and the new timestamp is appended if below limit.
- **Fatal memory flaw**: Memory consumption scales with request volume (`O(N)` where `N` is total requests per window). At 100,000 QPS, storing 64-bit timestamps consumes substantial Redis RAM and network serialization bandwidth.

### 5. Sliding Window Counter (Weighted Window)
- **Mental model**: Combines the counter from the previous fixed window with the current window using a time-weighted interpolation formula:

```text
C_estimated = C_current + C_previous * (1 - (t - t_window_start) / window_size)
```

- **Key property**: Memory-efficient (`O(1)` state per key) and completely eliminates the 2x boundary burst anomaly with minimal approximation error (<0.05% under steady traffic).

| Algorithm | State Size per Key | Burst Handling | Rolling Window Accuracy | CPU / Redis Overhead |
| --- | --- | --- | --- | --- |
| **Token Bucket** | O(1) (2 numbers) | Allowed up to capacity C | Bounded average; explicit burst | Very Low |
| **Leaky Bucket (Queue)** | O(Queue Size) | Disallowed (delays bursts) | Smooth constant rate | Moderate |
| **Fixed Window** | O(1) (1 integer) | Flawed (2x boundary burst) | Poor at window edges | Lowest |
| **Sliding Window Log** | O(N) (all timestamps)| Strictly enforced | Perfect | Extremely High |
| **Sliding Window Counter** | O(1) (2 counters) | Smoothed approximation | High (~99.9% accurate) | Low |

## Atomic distributed state in Redis with Lua

In a distributed environment, executing rate limiting as separate `GET`, `UPDATE`, and `SET` calls across a network connection creates a fatal **check-then-act race condition**:

```text
Instance A: GET key (balance = 1) ──┐ (Both see 1 token left)
Instance B: GET key (balance = 1) ──┘
Instance A: SET key (balance = 0, ALLOWED)
Instance B: SET key (balance = 0, ALLOWED)  <-- Race: 2 requests admitted for 1 token!
```

To achieve strict atomicity, the read, refill math, and deduction must run inside a single, transactional context on the state store. In Redis, this is implemented using an atomic **Lua script** executed via `EVALSHA`.

### Production-grade atomic Token Bucket in Lua

The following script implements a sub-millisecond atomic token bucket:
- Accepts capacity, refill rate, current millisecond timestamp, and requested tokens.
- Calculates elapsed time, refills tokens up to capacity, and performs the conditional deduction.
- Sets an automatic TTL on the Redis key to ensure idle keys are garbage-collected without manual intervention.

```lua
-- KEYS[1]: Rate limiter key (e.g., "rate:tenant_123:route_search")
-- ARGV[1]: Bucket capacity (maximum burst tokens, e.g., 50)
-- ARGV[2]: Refill rate per millisecond (e.g., 0.01 for 10 tokens/sec)
-- ARGV[3]: Current epoch timestamp in milliseconds
-- ARGV[4]: Tokens requested (typically 1)

local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate_ms = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

-- Retrieve current balance and last refill time from Redis hash
local data = redis.call("HMGET", key, "tokens", "last_updated")
local tokens = tonumber(data[1])
local last_updated = tonumber(data[2])

if tokens == nil then
  -- First request: initialize bucket to full capacity minus requested tokens
  tokens = capacity
  last_updated = now
else
  -- Calculate tokens earned during the elapsed time interval
  local elapsed = math.max(0, now - last_updated)
  local refilled = elapsed * refill_rate_ms
  tokens = math.min(capacity, tokens + refilled)
  last_updated = now
end

-- Determine admission
local allowed = 0
local remaining = tokens
if tokens >= requested then
  allowed = 1
  tokens = tokens - requested
  remaining = tokens
end

-- Persist updated state atomically
redis.call("HMSET", key, "tokens", tokens, "last_updated", last_updated)

-- Set TTL equal to time needed to refill from 0 to capacity + buffer
local ttl_seconds = math.ceil((capacity / (refill_rate_ms * 1000)) * 2)
redis.call("EXPIRE", key, math.max(60, ttl_seconds))

-- Return [allowed (0 or 1), remaining_tokens, retry_after_ms]
local retry_after_ms = 0
if allowed == 0 then
  retry_after_ms = math.ceil((requested - tokens) / refill_rate_ms)
end

return { allowed, math.floor(remaining), retry_after_ms }
```

## Latency optimization: Token leasing and batching

Querying a remote Redis cluster on every single HTTP request adds 1–3 ms of network round-trip time (RTT). At hundreds of thousands of requests per second, Redis network I/O and gateway connection pools become the primary scalability bottleneck.

### The Token Leasing pattern (Envoy RLS model)
To eliminate per-request network hops, distributed gateways implement **hierarchical local token leasing**:
1. The gateway process maintains a local in-memory token bucket for each active key.
2. Instead of requesting 1 token per request from Redis, the gateway process requests a **lease batch** of `B` tokens (e.g., 50 tokens) from the central Redis cluster in a single atomic transaction.
3. The local gateway satisfies the next 50 incoming requests entirely from its local in-memory bucket (<1 microsecond latency).
4. When the local balance drops below a low-water mark (e.g., 10 tokens), an asynchronous background worker requests the next batch from Redis.

```text
[ Incoming Requests ]
         │
         ▼ (< 1µs memory check)
[ Gateway Local Bucket ]
         │
         ├── Tokens available:
         │   Deduct & pass
         └── Low on tokens:
             Fetch 50 tokens async
                   │
                   ▼
         [ Redis Cluster ]
```

**Trade-off**: If a gateway pod crashes, unused leased tokens in its local memory are lost, causing slightly more restrictive throttling until the lease period elapses. In exchange, remote Redis QPS drops by a factor of 50x, and gateway request latency drops to pure local memory speed.

## Multi-tier defense-in-depth architecture

A robust production system never relies on a single rate limiter. Rate limits must be layered across the infrastructure:

```text
Layer 1: CDN (Cloudflare)
└── Volumetric DDoS & IP blocks

Layer 2: API Gateway (Envoy/Kong)
└── Auth Quotas (Tenant ID, Tier)

Layer 3: Service Mesh
└── Route Limits (Expensive DB routes)

Layer 4: Database Connection Pool
└── Global Concurrency / Semaphores
```

1. **Layer 1: Edge / CDN Layer**: Global IP-based rate limiting to absorb botnets, web scrapers, and Layer 7 DDoS floods before traffic enters private VPC networks.
2. **Layer 2: API Gateway Layer**: Customer-tier limits based on cryptographically verified JWT claims or API keys (`tenant_id:tier_gold`). Protects against rogue client loops.
3. **Layer 3: Route-Specific Protection**: Differentiated quotas based on compute cost (e.g., standard `GET /items` allows 5,000 req/min, while `POST /reports/export-pdf` allows 5 req/min).
4. **Layer 4: Database / Concurrency Limiter**: Uses Semaphore tokens to cap absolute **concurrency** (e.g., at most 50 concurrent expensive queries against the Postgres replica). Rate limiters manage rate over time; concurrency limiters manage simultaneous load.

## Resiliency, clock drift, and failure policies

When the central state store fails (network split, Redis failover, master CPU saturation), what should happen?

### Fail-Open vs. Fail-Closed decision matrix

```text
                      Redis Timeout:
├── Fail-Open:
│   Allow traffic (Risk: backend overload)
└── Fail-Closed:
    Block traffic (Risk: global outage)
```

| Strategy | Recommended Use Case | Failure Behavior | Safety Net Mechanism |
| --- | --- | --- | --- |
| **Fail-Open** | Public APIs, checkout paths, read-heavy user dashboards | Passes traffic downstream if Redis times out (>20ms) | Protect backends with downstream concurrency bulkheads and local emergency caps |
| **Fail-Closed** | Password resets, credit card payment gateways, expensive ML inference | Rejects traffic with HTTP 429 or 503 if Redis fails | Circuit breaker with fast fallback to local emergency in-memory limits |

### Clock drift in distributed systems
If multiple gateway nodes generate their own timestamps via system clocks (`now`), **NTP clock drift** (skew between servers) will corrupt token calculations. A server with a lagging clock will calculate negative elapsed time or grant extra tokens.
- **Rule**: Pass timestamps generated by the central state store (e.g., using Redis's own `redis.call('TIME')`) or clamp elapsed time strictly to `math.max(0, now - last_updated)` to ensure time never flows backward.

## HTTP response contract (RFC 6585 and IETF drafts)

When throttling requests, communicate quota context clearly to allow clients to back off intelligently rather than retrying aggressively.

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 12
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 12
RateLimit-Policy: 100;w=60

{
  "error": "too_many_requests",
  "message": "Quota exceeded. Retry in 12s.",
  "retry_after_seconds": 12
}
```

- `Retry-After`: Number of seconds (or HTTP date) the client must wait before retrying.
- `RateLimit-Limit`: Maximum quota allowed in the current window.
- `RateLimit-Remaining`: Number of tokens or requests remaining.
- `RateLimit-Reset`: Number of seconds until the quota resets to full capacity.

### Key takeaways

- Rate limiting protects downstream stability; it is a distributed consensus problem on high-throughput critical paths.
- Token Bucket is the industry standard for API traffic because it handles bursts while strictly enforcing long-term refill velocity.
- Distributed evaluations must be atomic; use Redis Lua scripts or single-flight coordinator patterns to eliminate check-then-act race conditions.
- Implement token leasing and local micro-buckets to avoid adding network round-trip latency to every request.
- Multi-tier defense-in-depth separates coarse IP filtering at the edge from granular tenant quotas at the API gateway and concurrency bulkheads at the database.

## References

- [IETF RFC 6585: Additional HTTP Status Codes (Section 4: 429 Too Many Requests)](https://www.rfc-editor.org/rfc/rfc6585)
- [IETF Internet-Draft: RateLimit Fields for HTTP](https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/)
- [Envoy Proxy: Global Rate Limiting Architecture](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/other_features/global_rate_limiting)
- [Redis Documentation: Programmability with Lua Scripts](https://redis.io/docs/latest/develop/interact/programmability/eval-intro/)
- [Martin Fowler: Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
