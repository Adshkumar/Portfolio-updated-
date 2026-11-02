---
title: "API Evolution: Backward Compatibility and Safe Migrations"
description: "Reduce API and database migration risk with staged compatibility, bounded backfills, measured validation, and an explicit deprecation plan."
slug: "api-evolution-and-safe-migrations"
date: "2026-10-25"
updated: "2026-11-02"
tags:
  - API Design
  - Architecture
  - Reliability
category: "Backend Engineering"
difficulty: "intermediate"
published: true
featured: false
author: "Adarsh Kumar"
cover: null
---

In distributed systems, deploying software is never an instantaneous, atomic cutover. Mobile apps installed on millions of iOS and Android devices may not be upgraded for months or years. Third-party enterprise partners consume API endpoints on their own release cycles. Internal microservices deploy independently across multiple regions and canaries.

When you need to rename a database column or alter an API response contract, you usually cannot "switch everything at midnight." Plan for old and new application versions to overlap, and define how each version behaves during that transition.

The **Expand-Migrate-Contract** (Parallel Change) pattern is a useful way to stage such changes. It reduces deployment risk but does not guarantee zero downtime; locks, incompatible clients, failed backfills, and operational limits still need to be managed.

![Expand-migrate-contract sequence for an API and database field change](/articles/images/api-evolution-migration.svg "Backward-compatible API and schema migration steps")

Figure 1: The phased Expand-Migrate-Contract lifecycle. Introduce the new representation alongside the legacy path, migrate data and readers, then retire the old path only after compatibility and usage checks. Metrics help inform the decision but cannot prove that every dormant or external client has migrated.

## The idea in plain language

A production system is a group of versions running at once: an old mobile app may still send the old request, while a newly deployed service expects the new field. A safe migration makes both versions work during the overlap instead of requiring every client, service, and database row to change at the same instant.

For a field rename, first add the new field without removing the old one. Deploy code that can read both representations, then write both and backfill historical rows. After validating the data and migrating supported readers, remove the old field in a later release. The pause between steps gives you time to observe and recover.

Use this pattern for changes that cross independently deployed services, clients, or large datasets. A one-step change can be simpler when all callers and data are under one controlled boundary.

## The 5-Phase Expand-Contract pattern

Consider an API and database rename: the service currently stores and returns a customer's `name` field, and a new version will call the same value `display_name`. This example changes the field name, not the meaning or structure of the data.

Executing this change requires an explicit, multi-stage state progression:

```text
Phase 1: EXPAND
└── Add nullable 'display_name'

Phase 2: DUAL-WRITE
└── Write to both old and new columns

Phase 3: BACKFILL
└── Background worker populates historical rows

Phase 4: SWITCH READS
└── Read new field; fallback by explicit policy

Phase 5: CONTRACT
└── Deprecate old API field & DROP column
```

### Phase 1: Expand (Additive schema change)
Add the new field to the database and API without removing the old one:
- In the database: Use a migration procedure appropriate for the database and table size. A nullable column is often easier to deploy before historical rows are backfilled; lock duration and default behavior are database-version-specific.
- In the API: The endpoint accepts and serves `display_name` while continuing to support the old `name` field.

### Phase 2: Dual-Writing
Deploy code that writes to *both* representations:
- Writes from old clients populate both `name` and `display_name`; writes from new clients do the same, with a documented rule if both fields are supplied and differ.
- **Read path**: Initially continues to use `name` while the new column is populated.
- **Why coordinate writes and backfill?** If writes only update one column while a backfill is running, the two representations can diverge. Dual-write or an equivalent ordered migration strategy before relying on the new value.

### Phase 3: Bounded backfill and reconciliation
Migrate historical database records in small, observable, rate-limited batches.
- Never run an unbounded update query:
  `UPDATE users SET display_name = name WHERE display_name IS NULL;`
  A large one-shot update can create long transactions, substantial logging, lock contention, and replication lag; actual impact depends on the database and workload.
- Use **Keyset Pagination** with strict batch sizes and sleep throttling (detailed in the database migration section below).
- Run automated verification: compare counts and values for the migrated population, account for writes that continue during the backfill, and reconcile discrepancies.

### Phase 4: Switch read traffic
Deploy application code that reads from `display_name`:
- Feature flags (e.g., LaunchDarkly) should control the read switch, enabling instant rollback if unexpected edge cases surface.
- Fall back to `name` only as an explicit migration policy; record and investigate unexpected missing values rather than hiding them indefinitely.
- Monitor error rates, data serialization times, and client telemetry.

### Phase 5: Contract (Decommission legacy artifacts)
Once you have validated the supported data set, deployed services and known clients use the new field, and the compatibility policy accounts for dormant or external clients, you can proceed to:
1. Stop reading the legacy `name` column in every deployed service. Keep compatibility behavior for old API clients by mapping the old field to `display_name` if the published policy still supports it.
2. Stop writing to the legacy column only after no deployed code or data workflow depends on it.
3. Remove the legacy API field according to the communicated compatibility policy; this can be a separate release from the database change.
4. Drop the old database column in a separate migration after confirming no deployed code or workflow depends on it.

## Safer database migrations under load

Executing Data Definition Language (`DDL`) operations on large production tables requires care. Lock modes, duration, and rewrite behavior depend on the database, version, statement, and table state; test the exact migration and plan for lock acquisition and rollback.

### Safe PostgreSQL DDL rules

```sql
-- Illustrative PostgreSQL migration; test it against the deployed version.
-- Choose limits appropriate to the operation and production workload.
SET lock_timeout = '2s';

-- Adding a nullable column still acquires a lock.
ALTER TABLE users ADD COLUMN display_name TEXT;

-- If the field needs an index, build it separately and outside a
-- transaction block. CONCURRENTLY permits ordinary writes but can take
-- longer and may fail.
CREATE INDEX CONCURRENTLY idx_users_display_name ON users (display_name);
```

Use `NOT VALID` followed by `VALIDATE CONSTRAINT` for suitable PostgreSQL constraints when staged validation is useful. Validation still scans data and consumes resources; it is not cost-free.

### Keyset pagination for high-throughput backfills

When backfilling millions of existing records, naive `OFFSET / LIMIT` pagination suffers from O(N) index-scan degradation: `OFFSET 1000000 LIMIT 1000` forces the database to traverse 1,000,000 index entries before reading the next 1,000 rows.

Use **Keyset Pagination** on the primary key, chunked in batches of 1,000:

```sql
-- Fetch the next batch using a keyset seek (index lookup plus work for the batch).
-- Capture a high-water mark before the migration and reconcile concurrent writes.
SELECT id, name
FROM users
WHERE id > :last_processed_id
  AND id <= :high_water_id
  AND display_name IS NULL
ORDER BY id ASC
LIMIT 1000;
```

```text
Worker Loop:
  1. Fetch 1,000 records where id > last_seen_id and id <= high_water_id.
  2. Copy name into display_name for this batch.
  3. Execute batch UPDATE within a transaction.
  4. Record the highest processed id as last_seen_id.
  5. Check replication lag and database load against service-specific limits;
     pause or throttle the worker when the migration affects foreground work.
```

## API contract evolution: Breaking vs. non-breaking

Define compatibility deliberately. Accepting unexpected input can hide client errors or create security problems, so be tolerant only where the API contract says unknown values are safe.

```text
Non-Breaking (Compatible):
- Add optional query param
- Add new field to response
- Add new endpoint (/v2/users/search)

Breaking (Incompatible):
- Rename existing request/response field
- Change field type (integer ID to UUID)
- Require a new request field before existing clients can provide it
- Change HTTP response status code
- Remove enum value or change error schema
```

### Tolerant readers and JSON serialization
In microservice architectures, consumers must implement the **Tolerant Reader pattern**:
- A consumer that ignores unknown response fields can often tolerate additive fields, but verify the behavior of deployed clients and generated code.
- Do not assume that unknown request fields or enum values are safe to accept; validate them according to the contract.

## HTTP deprecation and sunset signals

When an API endpoint or field is scheduled for retirement, notify client developers programmatically using standardized IETF HTTP headers:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Deprecation: @1793318400
Sunset: Wed, 11 Nov 2026 00:00:00 GMT
Link: </v2/users>; rel="successor-version"

{
  "name": "Adarsh Kumar",
  "display_name": "Adarsh Kumar"
}
```

- **`Deprecation` (RFC 9745)**: Signals that the resource is or will be deprecated; it does not itself change resource behavior.
- **`Sunset` (RFC 8594)**: Announces when a resource is expected to become unavailable; treat the value as the server's stated plan, not a guarantee of how every deployment will behave.
- **`Link: <...>; rel="successor-version"`**: Points clients directly to the documentation or URI of the replacement API.

## Event-driven schema evolution (Protobuf / Avro)

For asynchronous architectures (Kafka, SQS), schemas evolve via binary serialization protocols:

| Rule | Protocol (Protobuf / Avro) | Requirement |
| --- | --- | --- |
| **Field Tags** | Protocol Buffers (Protobuf) | Do not reuse a removed field number; reserve it. Renaming a field preserves its binary tag but can change generated APIs and ProtoJSON field names. |
| **Field Deletion** | Protobuf | Mark retired field numbers as `reserved` (e.g., `reserved 2, 15;`) to prevent future developers from reusing them and misinterpreting historical events. |
| **Avro Compatibility Modes** | Schema Registry | Enforce `FULL` compatibility: new schemas can read data written by old schemas (backward), and old schemas can read data written by new schemas (forward). |

### Key takeaways

- Zero-downtime evolution assumes deployed versions N and N+1 run concurrently for extended windows.
- The Expand-Migrate-Contract sequence separates physical data structure changes from application routing switches.
- Use database- and version-specific migration procedures, bounded lock waits, and measured backfills; no single DDL recipe is safe everywhere.
- Keyset pagination avoids repeatedly skipping large offsets, but batch size, cursor correctness, and concurrent writes still need attention.
- Communicate API deprecations transparently using IETF `Deprecation`, `Sunset`, and `Link` headers before removing fields.

## References

- [Martin Fowler: Parallel Change (Expand and Contract)](https://martinfowler.com/bliki/ParallelChange.html)
- [IETF RFC 8594: The Sunset HTTP Header Field](https://www.rfc-editor.org/rfc/rfc8594.html)
- [IETF RFC 9745: The Deprecation HTTP Response Header Field](https://www.rfc-editor.org/rfc/rfc9745)
- [PostgreSQL Documentation: Explicit Locking and Concurrent Index Creation](https://www.postgresql.org/docs/current/explicit-locking.html)
- [Martin Kleppmann: Schema Evolution in Avro, Protocol Buffers and Thrift](https://martin.kleppmann.com/2012/12/05/schema-evolution-in-avro-protocol-buffers-thrift.html)
