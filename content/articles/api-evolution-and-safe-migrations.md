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

An API change is not deployed to every caller at once. Mobile apps may remain installed for months, integrations may deploy on their own schedule, and background jobs can keep using an old schema after a new server version is live. Safe evolution assumes that old and new versions coexist.

A useful migration pattern is **expand, migrate, contract**: first add a compatible path, then move producers and consumers, and remove the old path only when evidence shows it is no longer needed.

## The expand-migrate-contract sequence

Suppose a service stores a customer's display name in one `name` field, and the API should split it into `given_name` and `family_name`. Replacing the old field immediately breaks clients that only know `name`. Instead, introduce the new representation while continuing to support the old one.

![Expand-migrate-contract sequence for an API and database field change](/articles/images/api-evolution-migration.svg "Backward-compatible API and schema migration steps")

Figure 1: The new fields are introduced before clients switch. During migration, the service keeps old and new representations compatible. The old field is removed only after traffic and stored data show it is safe.

The arrows show deployment order, not a guarantee that all instances or clients switch simultaneously. Each step needs a rollback strategy and a clear signal that it is complete.

## 1. Expand the schema and contract

Add the new database columns as nullable or with a safe default, and deploy code that can read both old and new records. For writes, choose one canonical representation. If both old and new clients write, define how conflicting values are resolved instead of guessing.

The API can return both fields for a transition period. The old `name` field should remain semantically stable while clients migrate. A field should not be silently repurposed to mean something different just because its type still matches.

## 2. Migrate stored data and clients

Backfill existing records in bounded batches. Make the backfill restartable, rate-limited, and observable; avoid one unbounded update that can hold locks or saturate the database. If writes continue during the backfill, use a version, change log, or dual-write strategy with a reconciliation pass so new writes are not missed.

Release clients that understand the new representation. Measure adoption using bounded metrics such as API version or client release—not user IDs as metric labels. Keep a compatibility path for clients that cannot be upgraded immediately.

Dual writes can help a transition but create two sources of truth. If one write succeeds and the other fails, data diverges. Prefer one authoritative representation and derive the compatibility response when possible. If dual writes are necessary, add reconciliation and an explicit retirement plan.

## 3. Verify and contract

Before removing the old field, confirm:

- supported clients have migrated or have a documented sunset date;
- old-field reads and writes have stopped for an agreed observation window;
- the backfill is complete and consistency checks pass;
- rollback no longer depends on the old representation;
- support, documentation, and downstream owners know the removal date.

Then remove the old field from the API and, in a later controlled database change, drop the column. Separating API removal from physical storage deletion can make rollback safer.

## Compatibility rules of thumb

Adding an optional response field is often compatible, but clients that reject unknown fields exist. Adding a required request field can break old clients. Changing nullability, enum values, ordering assumptions, timestamp semantics, or error shapes can also be breaking even when the JSON shape looks similar.

For event schemas, consumers may process old messages after a new producer is deployed. Preserve fields needed for replay and define how unknown fields are handled. Versioning the message schema is useful only when producers, consumers, storage, and replay behavior all follow the compatibility policy.

## Rollback and observability

Design every migration step so that rollback does not discard data written by the newer version. Rollbacks may require a forward fix or a compatibility release instead of reverting code. Capture migration progress, error counts, old/new field mismatches, and old-client request rates.

Run the change against representative data volume and concurrency. Verify indexes and locks, and consider the effect on replication lag and backups. A migration that is logically backward-compatible can still cause an availability incident if its database operation overwhelms the system.

### Key takeaways

- Old and new clients coexist; deployment is a timeline, not a single switch.
- Expand the schema and API before migrating clients or deleting old fields.
- Backfills and dual writes require bounded execution, observability, and reconciliation.
- Treat semantics, nullability, errors, and unknown fields as part of compatibility.
- Contract only when telemetry and rollback requirements confirm it is safe.

## References

- [Martin Fowler: Parallel Change](https://martinfowler.com/bliki/ParallelChange.html)
- [Google Cloud: Database migration strategies](https://cloud.google.com/architecture/database-migration-concepts-principles-part-1)
- [IETF RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)
