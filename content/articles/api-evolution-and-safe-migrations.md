---
title: "API Evolution: Backward Compatibility and Safe Migrations"
description: "Evolve APIs and schemas without breaking deployed clients by expanding first, observing adoption, and contracting only after old paths are unused."
slug: "api-evolution-and-safe-migrations"
date: "2026-10-25"
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

When you need to rename a database column or alter an API response contract, you cannot "switch everything at midnight." You must design the system so that **version N and version N+1 coexist seamlessly in production**.

The proven pattern for zero-downtime evolution is the **Expand-Migrate-Contract** (Parallel Change) architectural sequence.

![Expand-migrate-contract sequence for an API and database field change](/articles/images/api-evolution-migration.svg "Backward-compatible API and schema migration steps")

Figure 1: The phased Expand-Migrate-Contract lifecycle. The new representation is introduced alongside the legacy path (Expand). The system writes to both representations while existing historical data is backfilled (Migrate). The service switches reads to the new schema, and the legacy field is decommissioned only after metrics prove zero traffic remains (Contract).

## The 5-Phase Expand-Contract pattern

Consider a concrete production requirement: An e-commerce service stores a customer's single `name` string (`"Adarsh Kumar"`) in the database and returns it in JSON. The business requires splitting this into distinct `given_name` (`"Adarsh"`) and `family_name` (`"Kumar"`) attributes to support internationalization and identity verification.

Executing this change requires an explicit, multi-stage state progression:

```text
Phase 1: EXPAND
└── Add nullable 'given_name' & 'family_name'

Phase 2: DUAL-WRITE
└── Write to both old and new columns

Phase 3: BACKFILL
└── Background worker populates historical rows

Phase 4: SWITCH READS
└── Read new fields; fallback to old

Phase 5: CONTRACT
└── Deprecate old API field & DROP column
```

### Phase 1: Expand (Additive schema change)
Add the new fields to the database and API without touching existing fields:
- In the database: Add columns as **nullable** (or with a safe, non-blocking default). Never add a `NOT NULL` column without a default to an existing table, as this blocks writes from older application instances.
- In the API: The endpoint accepts the new fields optionally, while continuing to serve and accept the old `name` field.

### Phase 2: Dual-Writing
Deploy code that writes to *both* representations:
- Incoming writes containing `name` parse the string and write to both `name` and `(given_name, family_name)`.
- Incoming writes containing `(given_name, family_name)` concatenate and populate `name`.
- **Read Path**: Remains pinned to the old `name` column to ensure 100% stability.
- **Why dual-write first?** If you backfill historical records *before* dual-writing, any new writes occurring during the multi-hour backfill will immediately become stale and desynchronized.

### Phase 3: Bounded backfill and reconciliation
Migrate historical database records in small, observable, rate-limited batches.
- Never run an unbounded update query:
  `UPDATE users SET given_name = ..., family_name = ... WHERE given_name IS NULL;` -- DO NOT RUN!
  This locks millions of rows, saturates undo logs, balloons replication lag, and triggers write stalls across the database.
- Use **Keyset Pagination** with strict batch sizes and sleep throttling (detailed in the database migration section below).
- Run automated verification scripts: Compute checksums or row counts to ensure 100% of historical rows possess valid new fields.

### Phase 4: Switch read traffic
Deploy application code that reads primarily from `(given_name, family_name)`:
- Feature flags (e.g., LaunchDarkly) should control the read switch, enabling instant rollback if unexpected edge cases surface.
- Fall back gracefully to `name` if the new fields are unexpectedly empty.
- Monitor error rates, data serialization times, and client telemetry.

### Phase 5: Contract (Decommission legacy artifacts)
Once telemetry confirms that:
1. 100% of active database records have populated new fields,
2. All deployed services read from the new fields,
3. Upstream API callers have migrated to the new schema (or legacy clients have passed the documented deprecation sunset date),

You can safely proceed to:
1. Stop writing to the legacy `name` column.
2. Remove the `name` field from API responses (or return `null` / deprecation warnings).
3. Drop the legacy `name` column from the database in a planned maintenance release.

## Zero-downtime database migrations under load

Executing Data Definition Language (`DDL`) operations on multi-terabyte production tables (such as PostgreSQL or MySQL) requires extreme care. A naive `ALTER TABLE` can acquire an `ACCESS EXCLUSIVE` lock, queuing all incoming read and write transactions and causing application-wide timeouts.

### Safe PostgreSQL DDL rules

```sql
-- 1. Always set a strict lock timeout so DDL fails fast rather than queueing behind long queries
SET lock_timeout = '2s';
SET statement_timeout = '5s';

-- 2. Add columns as NULLABLE (instant metadata-only operation in Postgres 11+)
ALTER TABLE users ADD COLUMN given_name VARCHAR(100);
ALTER TABLE users ADD COLUMN family_name VARCHAR(100);

-- 3. Create indexes CONCURRENTLY (prevents table read/write locks)
CREATE INDEX CONCURRENTLY idx_users_family_name ON users (family_name);

-- 4. Add constraints as NOT VALID first, then validate asynchronously
ALTER TABLE users ADD CONSTRAINT check_given_name_length 
    CHECK (char_length(given_name) > 0) NOT VALID;

-- Validation scans table with a SHARE UPDATE EXCLUSIVE lock (does NOT block concurrent writes)
ALTER TABLE users VALIDATE CONSTRAINT check_given_name_length;
```

### Keyset pagination for high-throughput backfills

When backfilling millions of existing records, naive `OFFSET / LIMIT` pagination suffers from O(N) index-scan degradation: `OFFSET 1000000 LIMIT 1000` forces the database to traverse 1,000,000 index entries before reading the next 1,000 rows.

Use **Keyset Pagination** on the primary key, chunked in batches of 1,000:

```sql
-- Fetch next batch using keyset seek (O(1) index lookup)
SELECT id, name
FROM users
WHERE id > :last_processed_id
  AND (given_name IS NULL OR family_name IS NULL)
ORDER BY id ASC
LIMIT 1000;
```

```text
Worker Loop:
  1. Fetch 1,000 records where id > last_seen_id.
  2. Parse name into given_name and family_name in application memory.
  3. Execute batch UPDATE within a transaction.
  4. Record highest id as last_seen_id.
  5. Check replication lag:
     If pg_stat_replication.replay_lag > 1.0 second:
       Sleep 500ms (Throttle backfill to protect read replicas).
```

## API contract evolution: Breaking vs. non-breaking

Follow **Postel’s Law (The Robustness Principle)**: *"Be conservative in what you send, be liberal in what you accept."*

```text
Non-Breaking (Compatible):
- Add optional query param
- Add new field to response
- Add new endpoint (/v2/users/search)

Breaking (Incompatible):
- Rename existing request/response field
- Change field type (integer ID to UUID)
- Add mandatory request parameter
- Change HTTP response status code
- Remove enum value or change error schema
```

### Tolerant readers and JSON serialization
In microservice architectures, consumers must implement the **Tolerant Reader pattern**:
- Deserializers must be explicitly configured to ignore unknown fields (`@JsonIgnoreProperties(ignoreUnknown = true)` in Java Jackson, or avoid strict struct validation in Go/TypeScript).
- This allows producers to add new fields safely without breaking deployed downstream consumers.

## Standardized HTTP deprecation headers

When an API endpoint or field is scheduled for retirement, notify client developers programmatically using standardized IETF HTTP headers:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Deprecation: @1793318400
Sunset: Wed, 11 Nov 2026 00:00:00 GMT
Link: </v2/users>; rel="successor-version"

{
  "name": "Adarsh Kumar",
  "given_name": "Adarsh",
  "family_name": "Kumar"
}
```

- **`Deprecation` (RFC 8594)**: Indicates that the endpoint or resource is deprecated, optionally specifying an epoch timestamp when deprecation began.
- **`Sunset` (RFC 8594)**: The exact date/time after which the endpoint will become unresponsive or permanently removed.
- **`Link: <...>; rel="successor-version"`**: Points clients directly to the documentation or URI of the replacement API.

## Event-driven schema evolution (Protobuf / Avro)

For asynchronous architectures (Kafka, SQS), schemas evolve via binary serialization protocols:

| Rule | Protocol (Protobuf / Avro) | Requirement |
| --- | --- | --- |
| **Field Tags** | Protocol Buffers (Protobuf) | Never change the numeric field tag (e.g., `string given_name = 1;`). Field names can change, but the numeric tag is permanently bound. |
| **Field Deletion** | Protobuf | Mark retired field numbers as `reserved` (e.g., `reserved 2, 15;`) to prevent future developers from reusing them and misinterpreting historical events. |
| **Avro Compatibility Modes** | Schema Registry | Enforce `FULL` compatibility: new schemas can read data written by old schemas (backward), and old schemas can read data written by new schemas (forward). |

### Key takeaways

- Zero-downtime evolution assumes deployed versions N and N+1 run concurrently for extended windows.
- The Expand-Migrate-Contract sequence separates physical data structure changes from application routing switches.
- In production databases, always use lock timeouts, add columns as nullable, create indexes concurrently, and validate constraints in separate non-blocking passes.
- Keyset pagination prevents database I/O degradation during multi-million-row data backfills.
- Communicate API deprecations transparently using IETF `Deprecation`, `Sunset`, and `Link` headers before removing fields.

## References

- [Martin Fowler: Parallel Change (Expand and Contract)](https://martinfowler.com/bliki/ParallelChange.html)
- [IETF RFC 8594: The Sunset HTTP Header Field](https://www.rfc-editor.org/rfc/rfc8594.html)
- [IETF Internet-Draft: The Deprecation HTTP Header Field](https://datatracker.ietf.org/doc/draft-ietf-httpapi-deprecation-header/)
- [PostgreSQL Documentation: Explicit Locking and Concurrent Index Creation](https://www.postgresql.org/docs/current/explicit-locking.html)
- [Martin Kleppmann: Schema Evolution in Avro, Protocol Buffers and Thrift](https://martin.kleppmann.com/2012/12/05/schema-evolution-in-avro-protocol-buffers-thrift.html)
