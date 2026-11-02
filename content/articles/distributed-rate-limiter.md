---
title: "Designing a Distributed Rate Limiter"
description: "Compare token buckets and sliding windows, then reason about shared state, atomic admission, failure policy, and operational safeguards."
slug: "distributed-rate-limiter"
date: "2026-10-25"
updated: "2026-11-02"
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

Rate limiting is a rule that controls how much work a client can ask a service to do over time. A service might allow a customer 60 search requests per minute, while allowing only 5 expensive report exports. The limit protects capacity and helps share it fairly; it is not, by itself, protection against every denial-of-service attack.

A **quota** is the policy (for example, requests per customer and route). A **rate-limiting algorithm** decides whether a particular request fits within that policy. In a single server, one process can make the decision using local memory. With multiple gateway servers, the system must decide whether they share one quota or each keep a local portion of it.

![An authenticated request is matched to a quota policy, evaluated against local or shared state, then allowed to the application or rejected with HTTP 429](/articles/images/rate-limiter-flow.svg "Request admission and rate-limit decision flow")

Figure 1: The request is matched to a quota policy and checked before backend work begins. Quota state can be local or shared; distributed deployments choose based on their consistency and coordination needs. Admitted requests proceed, while rejected requests receive `HTTP 429 Too Many Requests`.

## A simple example

Suppose an API should sustain about 60 requests per minute for a customer, while allowing a short burst of up to 10 requests after a quiet period. A token bucket can express that policy with a capacity of 10 tokens and a refill rate of 1 token per second:

1. A request costs 1 token.
2. If the bucket has a token, the request is admitted and one token is removed.
3. If the bucket is empty, the request is rejected and needs to wait about one second for the next token.
4. After 10 quiet seconds, the bucket is full again, but it never holds more than 10 tokens.

This is not a strict limit of 60 requests in every rolling 60-second interval: the initial burst is in addition to tokens earned while the interval passes. If the product requires a hard rolling-window maximum, choose a sliding-window policy instead.

Now imagine the customer sends requests through two gateway servers. If each server has its own full bucket, the customer may receive twice the intended burst. A shared decision avoids that duplication, but adds a network dependency. Alternatively, the service can deliberately divide or lease quota to gateways and accept the resulting trade-offs.

This example separates three decisions that are easy to mix up: **who is limited** (the quota key), **what behavior is allowed** (the algorithm and parameters), and **where the current quota state lives** (local memory or shared storage).

## First: decide who shares a quota

A quota needs a key that identifies whose usage is being counted. Common choices include an authenticated customer, an API credential, a user, an IP address, or a combination such as customer plus route. The choice should match the policy: if every route shares one customer quota, use a customer key; if expensive exports have a separate limit, include the route or policy name.

Use an identity the server has verified. Do not trust a client-supplied tenant ID or forwarding header by itself. IP-based limits can be useful for anonymous traffic, but proxies and shared networks mean an IP address may represent many people—or one person may appear under several addresses.

For example, `tenant:acme:route:search` and `tenant:acme:route:export` represent separate per-route buckets. Whatever the key format, ensure that tenants cannot choose another tenant's key.

## Algorithmic foundations and trade-offs

The algorithms below answer different policy questions. First decide whether bursts should be allowed, delayed, or rejected; then decide whether a small boundary approximation is acceptable.

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
- **Mental model**: A bucket holds at most `C` tokens. It earns `r` tokens per second, up to that capacity. An operation costing `k` tokens is admitted only if at least `k` are available.
- **Example**: With `C = 10` and `r = 1` token per second, a full bucket allows 10 requests at once. Afterward, it allows one more request per second. Quiet time refills the bucket, but never above 10.
- **Use it when**: Short bursts are acceptable, but average use should be limited over time.
- **State required**: Current token balance and the time it was last updated.

### 2. Leaky Bucket (Traffic Shaper vs. Traffic Meter)
- **As a queue (traffic shaper)**: Requests enter a bounded first-in, first-out queue and leave at a controlled rate. The queue smooths bursts but adds waiting time; requests must be rejected if it fills.
- **As a traffic meter**: A request is accepted or rejected based on its arrival time rather than being queued. GCRA is a common virtual-scheduling formulation and can allow a configured burst tolerance.
- **Use it when**: You want to smooth work sent to a downstream system, or enforce a regular arrival pattern. A queue is not the same behavior as an immediate allow-or-reject limiter.

### 3. Fixed Window Counter
- **Mental model**: Divides time into fixed intervals (e.g., 1 minute). A counter increments per window. If the limit is reached, further requests are rejected until the next window.
- **Trade-off**: A client can use the full quota at the end of one interval and again at the start of the next. With a limit of 60 per minute, as many as 120 requests could pass in a short period around the boundary. This may be acceptable for simple policies, but it is not a strict rolling-minute limit.
- **Use it when**: Simplicity matters and brief boundary bursts are acceptable.

### 4. Sliding Window Log
- **Mental model**: Maintains a timestamp for every admitted request. On each request, timestamps older than `(t - window)` are removed, the remaining count is checked, and the new timestamp is stored if below the limit.
- **Trade-off**: Memory and per-request work scale with the number of timestamps retained for each key (`O(N)` within the window). This can be expensive for high-volume keys.
- **Use it when**: The exact rolling-window count is important and the traffic volume is small enough to store and process individual timestamps.

### 5. Sliding Window Counter (Weighted Window)
- **Mental model**: Combines the counter from the previous fixed window with the current window using a time-weighted interpolation formula:

```text
C_estimated = C_current + C_previous * (1 - (t - t_window_start) / window_size)
```

- **Key property**: Memory-efficient (`O(1)` state per key) and reduces the fixed-window boundary burst by estimating recent usage. It is an approximation; error depends on how requests are distributed within each window.
- **Use it when**: You want a smoother approximation than a fixed window without storing every request timestamp.

| Algorithm | State per key | What happens to bursts? | Main trade-off |
| --- | --- | --- | --- |
| **Token bucket** | Constant-size balance and timestamp | Allowed up to configured capacity | A good fit when small bursts are useful |
| **Leaky-bucket queue** | Queue of waiting work | Delayed and smoothed | Adds latency; needs a queue-size limit |
| **Fixed window** | One counter per active window | Can double around a boundary | Simple, but not a strict rolling-window limit |
| **Sliding-window log** | One timestamp per admitted request | Rejected once the exact rolling limit is reached | Accurate, but state grows with traffic |
| **Sliding-window counter** | A small number of counters | Boundary bursts are estimated and reduced | Lower storage than a log, but approximate |

These are policy choices, not a universal ranking. For example, queueing may be appropriate for a background job but unacceptable for an interactive API where the caller expects an immediate answer.

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

The following script demonstrates an atomic token-bucket decision:
- Accepts capacity, refill rate, and requested tokens; it reads time from Redis so gateway clock skew cannot distort refill calculations.
- Calculates elapsed time, refills tokens up to capacity, and performs the conditional deduction.
- Sets an automatic TTL on the Redis key to ensure idle keys are garbage-collected without manual intervention.

```lua
-- KEYS[1]: Rate limiter key (e.g., "rate:tenant_123:route_search")
-- ARGV[1]: Bucket capacity (maximum burst tokens, e.g., 50)
-- ARGV[2]: Refill rate per millisecond (e.g., 0.01 for 10 tokens/sec)
-- ARGV[3]: Tokens requested (typically 1)

local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate_ms = tonumber(ARGV[2])
local requested = tonumber(ARGV[3])

if not capacity or not refill_rate_ms or not requested
   or capacity <= 0 or refill_rate_ms <= 0 or requested <= 0
   or requested > capacity then
  return redis.error_reply("invalid token bucket configuration or request")
end

local redis_time = redis.call("TIME")
local now = tonumber(redis_time[1]) * 1000
  + math.floor(tonumber(redis_time[2]) / 1000)

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
  -- Do not move stored time backward if the Redis server clock moves backward.
  now = math.max(now, last_updated)
  local elapsed = now - last_updated
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

Checking a remote Redis service for every request adds a network hop. Its latency and capacity depend on the network, Redis deployment, and request load, so measure before assuming it is the bottleneck.

### The token-leasing pattern
To reduce per-request network hops, gateways can use **local token leasing**:
1. The gateway process maintains a local in-memory token bucket for each active key.
2. Instead of requesting 1 token per request from Redis, the gateway process requests a **lease batch** of `B` tokens (e.g., 50 tokens) from the central Redis cluster in a single atomic transaction.
3. The local gateway satisfies the next 50 incoming requests entirely from its local in-memory bucket (<1 microsecond latency).
4. When the local balance drops below a low-water mark, the gateway requests another batch before it runs out. Requests arriving while no lease is available need an explicit policy: wait briefly, reject, or use a bounded local fallback.

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

**Trade-off**: Unused tokens held by a gateway are not available to other gateways until returned or expired, so usage can be uneven and some quota may go unused. Leasing reduces coordination traffic; it does not make every global limit perfectly fair or eliminate the need to handle lease exhaustion.

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

1. **Layer 1: Edge / CDN Layer**: Coarse IP-based rules can filter some abusive traffic before it reaches private services. Rate limiting alone does not absorb all volumetric or distributed attacks.
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
| **Fail-Open** | Operations where availability is more important than strictly enforcing the quota | Passes traffic downstream if the quota service is unavailable | Protect backends with concurrency limits and bounded local emergency caps |
| **Fail-Closed** | Operations where bypassing the quota creates unacceptable risk or cost | Rejects or defers requests if the quota service is unavailable | Return a clear error and monitor the dependency failure |

### Clock drift in distributed systems
All gateways updating the same bucket need a consistent time source. If their clocks disagree, one node can calculate the refill from a time that is earlier or later than another node's. Clamping a negative elapsed interval prevents that calculation from subtracting tokens, but by itself does not correct a clock that is ahead. Use one authoritative clock for the bucket, or explicitly design and test the behavior under clock skew.

## What should the client receive?

When throttling requests, communicate quota context clearly to allow clients to back off intelligently rather than retrying aggressively.

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 12

{
  "error": "too_many_requests",
  "message": "Quota exceeded. Retry in 12s.",
  "retry_after_seconds": 12
}
```

- `Retry-After`: Number of seconds (or HTTP date) the client must wait before retrying.

`429 Too Many Requests` is defined by [RFC 6585](https://www.rfc-editor.org/rfc/rfc6585), which says a response may include `Retry-After`. The `RateLimit` response fields are being developed in an IETF Internet-Draft, not a finalized RFC; implementations should check the current draft and avoid assuming that quota metadata has one universally deployed format.

### Key takeaways

- Rate limiting defines an admission policy: identify the caller, choose a quota, evaluate its state, and allow or reject the request.
- A token bucket is useful when controlled bursts are acceptable; its capacity sets the burst size and its refill rate sets the long-term pace.
- Shared state can coordinate gateways more closely, but adds latency and a dependency. Atomic updates prevent concurrent requests from spending the same stored quota state twice.
- Local counters or leased tokens reduce coordination at the cost of fairness, unused quota, or bounded over-admission depending on the design.
- Multi-tier defense-in-depth separates coarse IP filtering at the edge from granular tenant quotas at the API gateway and concurrency bulkheads at the database.

## References

- [IETF RFC 6585: Additional HTTP Status Codes (Section 4: 429 Too Many Requests)](https://www.rfc-editor.org/rfc/rfc6585)
- [IETF Internet-Draft: RateLimit header fields for HTTP (work in progress)](https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/)
- [Envoy Proxy: Global Rate Limiting Architecture](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/other_features/global_rate_limiting)
- [Redis Documentation: Programmability with Lua Scripts](https://redis.io/docs/latest/develop/interact/programmability/eval-intro/)
- [Martin Fowler: Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
