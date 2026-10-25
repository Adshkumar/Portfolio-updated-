---
title: "MVCC and Transaction Isolation: From Snapshots to Serializable"
description: "Understand multi-version concurrency control, read and write conflicts, snapshot-isolation anomalies, serializable execution, and the operational costs of long-running transactions."
slug: "mvcc-isolation-serializable-transactions"
date: "2026-10-25"
tags:
  - Databases
  - Transactions
  - Reliability
category: "Databases"
difficulty: "advanced"
published: true
featured: false
author: "Adarsh Kumar"
cover: null
---

Transactions let an application treat multiple database operations as one logical unit. Under concurrency, however, correctness depends on which committed states each transaction can observe and what happens when transactions modify overlapping data.

**Multi-version concurrency control (MVCC)** is a family of techniques databases use to retain multiple row versions so readers can often work without blocking writers. It improves concurrency, but it does not make every transaction anomaly disappear. In particular, a consistent snapshot is not automatically equivalent to executing transactions one at a time.

## A row can have more than one visible version

In an MVCC system, an update commonly creates a new logical row version instead of immediately overwriting the version that older transactions may still need. A transaction reads versions visible under its snapshot and ignores versions that were not committed in time for that snapshot. The exact metadata and cleanup strategy differ among engines.

![MVCC snapshots show two transactions reading a consistent snapshot while a later committed row version becomes visible only to a new transaction](/articles/images/mvcc-snapshot-visibility.svg "MVCC row-version visibility across transaction snapshots")

Figure 1: Transaction A keeps its original snapshot and continues to see the previous value of row X. Transaction B commits a new version. A new transaction can see that committed version, while A's view does not change. The diagram is conceptual: databases use engine-specific transaction IDs, timestamps, locks, and version metadata.

This lets a reader avoid waiting for a writer in many common cases, and lets a writer avoid overwriting data needed by an existing reader. It is not a promise that reads never block: schema changes, explicit locks, foreign-key checks, and engine-specific rules can still introduce waits.

Versions also have a storage cost. An old version cannot be reclaimed while an active transaction might still need it. Long-lived snapshots can therefore delay cleanup, increase table or index bloat, and make vacuuming or garbage collection less effective. MVCC trades some storage and maintenance work for concurrency; it does not make the old versions free.

## Isolation is about allowed observations

The SQL isolation-level names are useful, but implementations differ. An application's correctness should be based on the behavior documented by its specific database, not on the level's name alone.

| Isolation level (SQL terminology) | Broad intent | Important caveat |
| --- | --- | --- |
| Read uncommitted | Permit the weakest visibility guarantees | Many MVCC engines treat it like read committed instead of exposing uncommitted row versions |
| Read committed | Each statement sees committed data as of that statement's snapshot | Two statements in one transaction may see different committed states |
| Repeatable read | Keep a stable view for repeated reads, depending on engine semantics | A stable snapshot can still allow write skew |
| Serializable | Preserve outcomes equivalent to some serial order | Transactions can abort and must be safely retried |

Names such as **snapshot isolation** and **repeatable read** are not interchangeable guarantees across products. For example, PostgreSQL documents its repeatable-read implementation as snapshot isolation and also documents that it can permit serialization anomalies. Other engines may detect different conflicts or apply different locking rules.

## A stable snapshot can still allow write skew

Consider a service that must keep at least one doctor on call. Two doctors are on call, and the rule is that at least one must remain. Each transaction checks the current count and turns off one doctor's on-call flag if the count is greater than one.

1. Transaction A reads that both doctors are on call.
2. Transaction B reads the same snapshot.
3. A turns off doctor 1; B turns off doctor 2.
4. Both update different rows and commit.

Each transaction's individual check was true in its snapshot. Because the writes affect different rows, a basic write-write conflict check may not force either one to abort. The final state violates the invariant: nobody is on call. This is **write skew**, a classic anomaly possible under snapshot isolation.

![Two transactions read overlapping rows in one snapshot and write different rows, allowing write skew unless the invariant is protected](/articles/images/mvcc-write-skew.svg "Write skew under snapshot isolation and the missing cross-row conflict")

Figure 2: Both transactions read the same two-row snapshot but update different rows. A conflict detector that only notices same-row writes may allow both commits, violating the invariant. Serializable execution must prevent this outcome, for example by aborting a transaction or by enforcing the invariant through a suitable lock or constraint.

The central mistake is treating “I read a consistent snapshot” as “my transaction is equivalent to running alone.” A transaction can make a decision based on several rows and then update only one of them. The decision's correctness depends on a relationship across rows, not just on avoiding lost updates to the row it changed.

## Protecting an invariant

The strongest simple solution is often to represent the invariant in a way the database can enforce. A unique constraint, check constraint, exclusion constraint, or foreign key can protect some rules more reliably than application-side check-then-write logic. But not every cross-row or aggregate rule can be expressed as a constraint.

When the invariant cannot be encoded directly, consider these approaches:

- **Serializable isolation:** Ask the database to reject executions that cannot be explained by a serial order. The application must handle serialization failures by retrying the entire transaction.
- **Lock a shared coordination row:** Make all transactions that affect the invariant contend on the same row, such as a schedule or capacity record. Acquire the lock before reading the state used for the decision.
- **Redesign the state:** Store a counter or allocation record that becomes the single transactional coordination point, with constraints protecting its valid range.
- **Use an explicit advisory lock:** Coordinate on a stable logical key if the database supports it, while carefully defining lock scope and handling connection and transaction lifetimes.

Locks only help if every relevant code path follows the same protocol. Locking one doctor row in each transaction would not serialize decisions that depend on the total across both rows. A shared lock target can make the decision safe, but it can also reduce concurrency and become a hotspot.

Constraints are generally valuable as a final defense even when the application checks first for a better error message. A pre-check can improve UX; the database constraint handles concurrent requests racing past that check.

## What serializable means in practice

Serializable isolation does not necessarily mean the database locks every row and runs transactions strictly one at a time. Engines may use predicate or range locks, dependency tracking, validation at commit, or other techniques to ensure committed outcomes are serializable.

Some implementations use **serializable snapshot isolation (SSI)**. In broad terms, the engine tracks read/write dependencies that could form a cycle in the serialization graph. If committing all involved transactions would permit a non-serializable outcome, it aborts one rather than allowing that outcome. This can preserve high read concurrency, but workloads with many conflicting transactions can see more serialization failures.

An abort is an expected part of the isolation contract, not necessarily a database fault. Retry the **whole transaction** from its beginning so that it reads a fresh snapshot and recomputes its decisions. Retrying only the failed statement can reuse assumptions made from a stale snapshot.

Retries must also be safe. Keep external side effects—sending an email, charging a provider, publishing an irreversible action—outside the retried transaction, or coordinate them through a durable outbox or idempotent downstream operation. Otherwise a transaction attempt that later aborts might still have produced an external effect.

## Deadlocks and lock ordering

Even with MVCC, writes and explicit locks can block. A deadlock occurs when transactions wait on each other in a cycle. For example, A locks row 1 then waits for row 2, while B holds row 2 and waits for row 1. A database detects the cycle and aborts one participant.

Acquire locks in a consistent order where possible, keep transactions short, and avoid waiting on network calls while holding database locks. Treat deadlock victims as retryable only when the whole operation is safe to repeat. A retry policy should be bounded, include jitter when contention is high, and distinguish transient concurrency failures from validation or permission errors.

## Long transactions affect storage and operations

An idle transaction can be harmful even when it is not holding an obvious row lock. If it keeps an old snapshot open, cleanup may need to preserve old row versions and other transaction metadata. This can contribute to bloat and increased I/O. Open transactions can also hold locks, consume connections, delay DDL, and complicate failover or replication behavior.

Track more than transaction duration averages:

- oldest active transaction and snapshot age;
- lock waits, deadlock counts, and blocked-session duration;
- serialization failures and application retry success rates;
- version cleanup lag, dead tuples or equivalent engine metrics, and storage growth;
- connection-pool saturation and transactions left idle in a transaction.

Alert thresholds should reflect the database's cleanup cadence and workload. A long read-only report may be acceptable in one system and disruptive in another; the operational impact depends on how the engine retains and reclaims versions.

## A testing approach

Concurrency bugs rarely appear in sequential unit tests. Build deterministic tests with barriers so transactions take their reads before either is allowed to write. For each business invariant, test competing transactions that:

1. read the same initial state;
2. make individually valid decisions;
3. update overlapping rows and, separately, disjoint rows;
4. commit in both possible orders;
5. run under every isolation level the application supports.

Assert the invariant after all transactions finish, and verify that serialization or deadlock retries restart the complete transaction. Test constraint violations and process failures too. Use the actual database engine for integration tests: a mock or a different database may not reproduce its isolation semantics.

### Key takeaways

- MVCC retains row versions so transactions can read a snapshot while concurrent writes proceed.
- Snapshot consistency does not guarantee serializable behavior; write skew can violate cross-row invariants.
- Prefer database constraints for enforceable invariants, and use serializable isolation or explicit coordination when needed.
- Serializable transactions can abort; retry the complete transaction and keep irreversible side effects outside retry attempts.
- Long-lived snapshots and lock waits have storage and availability costs even when request latency initially looks fine.
- Verify concurrency behavior against the exact database and isolation level used in production.

## References

- [PostgreSQL: Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [PostgreSQL: Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [Berenson et al.: A Critique of ANSI SQL Isolation Levels](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/tr-95-51.pdf)
- [Fekete et al.: Making Snapshot Isolation Serializable](https://www.cs.umb.edu/~poneil/ROTransaction.pdf)
