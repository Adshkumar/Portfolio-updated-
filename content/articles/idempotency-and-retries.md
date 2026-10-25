---
title: "Idempotency, Retries, and Duplicate Processing"
description: "Design retryable APIs by pairing idempotency keys with durable request records, explicit states, bounded retention, and honest delivery guarantees."
slug: "idempotency-and-retries"
date: "2026-10-25"
tags:
  - Distributed Systems
  - API Design
  - Reliability
category: "Distributed Systems"
difficulty: "advanced"
published: true
featured: false
author: "Adarsh Kumar"
cover: null
---

Retries are necessary when a client cannot tell whether a request reached the server. A timeout is an observation about communication, not proof that the operation failed. If a payment-like operation commits on the server but its response is lost, the client may retry and accidentally cause a second effect.

**Idempotency** means that repeating an operation with the same identity does not create additional effects after the first successful execution. It does not mean the network delivers a request exactly once. The system must define what gets deduplicated, for whom, and for how long.

## The duplicate-request path

An idempotency key identifies one logical operation. The client generates a high-entropy key and reuses it when retrying the same request. The server scopes the key to an authenticated principal and operation, and stores a record before it can safely claim that the request is complete.

![Client retry flow using an idempotency key and a durable request record](/articles/images/idempotency-retry-flow.svg "Idempotency key lookup and duplicate response path")

Figure 1: The first request claims the key and performs the operation; a retry with the same key returns the recorded outcome rather than performing the effect again. A key reused with different input must be rejected.

The persistence boundary matters. If the service writes a "completed" idempotency record before applying the business change, a crash between those steps can report success when no effect happened. If it applies the effect first and crashes before recording completion, a retry can repeat the effect. When both changes live in one transactional database, storing the request result and changing business state in the same transaction is often the clearest boundary.

When an operation crosses services or external providers, one local database transaction cannot cover every effect. Persist a durable workflow state, use an outbox for messages where appropriate, and make downstream consumers idempotent too. These techniques reduce duplicate effects but do not remove the need to define recovery and reconciliation.

## A request record and state machine

A request record can include the scoped key, a hash of the normalized request payload, a state such as `processing` or `completed`, the response status and body, timestamps, and an expiry policy. Storing a payload hash prevents clients from accidentally reusing one key for a different operation.

The unique constraint on `(principal_id, operation, idempotency_key)` provides a concurrency boundary. If two copies arrive at the same time, only one should claim the key. The other request can wait briefly, return a conflict or in-progress response, or read the completed result after the first finishes. The exact behavior is part of the API contract.

Do not persist secrets or unnecessary personal data in a replayable response. Restrict who can retrieve the result, and scope records so one account cannot probe another account's keys.

## Retries need bounds

Retry only failures that may be transient, and use a bounded exponential backoff with jitter. A timeout, connection reset, or selected server response might merit a retry; a validation error generally does not. Set an overall deadline so retries do not outlive the user's request or amplify overload.

If every client retries immediately, a struggling dependency receives synchronized traffic exactly when it has the least capacity. Jitter spreads retries over time. A retry budget or circuit breaker can limit the additional load. Keep retry policy at the layer that understands the operation; retries at multiple layers can multiply unexpectedly.

The client should preserve the same idempotency key for every attempt of one logical operation, but generate a fresh key for a genuinely new operation. A key should be difficult to guess, and the server must still authenticate and authorize every attempt.

## Retention and guarantees

Deduplication lasts only as long as the server remembers the key. After the retention window expires, a late retry may be treated as a new operation. Choose the window based on client retry behavior, processing delays, and business risk; communicate the limit where clients depend on it.

At-least-once delivery means a message may be delivered again, so consumers need idempotent state transitions or deduplication. At-most-once processing can lose work if a message is acknowledged before the effect is durable. "Exactly once" needs a carefully bounded scope—for example, one broker's transaction semantics do not automatically make an external email, payment, or database update exactly once.

## Test the failure gaps

Tests should include a lost response after commit, two concurrent requests with one key, a crash while a record is processing, reuse of a key with a different payload, expired keys, and a downstream timeout after the downstream system may have committed. Verify both the returned result and the number of business effects.

Operationally, measure duplicate hits, in-progress requests, processing age, failures, and records nearing expiry. An old `processing` record needs a recovery policy; blindly deleting it can permit a duplicate effect, while keeping it forever can block legitimate recovery.

### Key takeaways

- A timeout cannot tell a client whether a server-side effect committed.
- Idempotency keys identify one logical operation and must be scoped and retained deliberately.
- Durable state and the business effect need a carefully chosen consistency boundary.
- Retries should be bounded, jittered, authorized, and limited to plausible transient failures.
- Exactly-once claims must name the system boundary and failure semantics they cover.

## References

- [AWS Builders' Library: Making retries safe with idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)
- [IETF RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)
- [Martin Kleppmann: Designing Data-Intensive Applications, Chapter 8](https://dataintensive.net/)
