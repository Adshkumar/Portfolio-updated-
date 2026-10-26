---
title: "Database Partitioning, Sharding, and Consistent Hashing"
description: "Design data placement for growth: compare range and hash partitioning, understand consistent hashing's limits, and plan safe rebalancing, hot-key mitigation, and cross-shard queries."
slug: "database-partitioning-sharding-consistent-hashing"
date: "2026-10-25"
tags:
  - Databases
  - Distributed Systems
  - Scalability
category: "Databases"
difficulty: "advanced"
published: true
featured: false
author: "Adarsh Kumar"
cover: null
---

Splitting a database is easy to describe and difficult to operate. The moment records live in different places, the system must answer three questions reliably: **which records belong together, where does a request go, and how can placement change without losing or duplicating writes?**

Partitioning, sharding, and consistent hashing are related, but they solve different parts of that problem. Partitioning divides a dataset into subsets. Sharding distributes those subsets across independently managed database nodes. A partitioning or routing strategy decides which subset owns a record; consistent hashing is one way to limit how much ownership changes when the set of nodes changes.

## Partitioning is not the same as sharding

The word *partitioning* is used for more than one boundary. A relational database may partition a table into child tables while keeping them inside one database instance. A distributed database may use the same word for data ranges spread across a cluster. *Sharding* usually means the application or database distributes data across separate nodes, each of which owns only part of the logical dataset.

These boundaries affect different costs:

| Technique | What is divided | Typical benefit | What it does not provide by itself |
| --- | --- | --- | --- |
| Table partitioning | One table into manageable pieces | Pruning, retention, and maintenance scoped to relevant partitions | More write capacity from another independent machine |
| Sharding | A logical dataset across database nodes | More aggregate storage and node-level read/write capacity | Cheap joins, global ordering, or automatic failover |
| Replication | Copies of data across nodes | Read capacity or availability, depending on the protocol | More write capacity for the same replicated dataset |

An architecture can combine them: each shard can hold a subset of tenants, and each shard's large event table can be partitioned by time. That does not make the terms interchangeable. Local table partitioning can improve maintenance without spreading load, while adding shards introduces distributed routing and consistency concerns.

## Start with the access pattern and partition key

A partition key determines where a record is stored and often constrains which queries remain efficient. Choose it from the operations the system must perform, not from whichever field looks evenly distributed in a sample.

Suppose an event service commonly reads a tenant's activity in time order. A compound key such as `(tenant_id, event_time)` makes a tenant's records addressable and supports ordered reads within that tenant. The system might hash `tenant_id` to choose a shard, then range-partition that shard's event table by `event_time`. The hash spreads tenants; the time partitions make retention and time-bounded scans manageable.

![A tenant key is hashed to a logical bucket and shard, then event time selects a local table partition; adding a node moves only selected bucket ownership after data is copied and validated](/articles/images/database-sharding-routing.svg "Example of hash-based shard routing, time partitioning, and controlled rebalancing")

Figure 1: Hashing `tenant_id` routes a request to a shard, while `event_time` selects a local partition within that shard. A bucket-to-shard map allows selected buckets to move to a new node. The map switch follows data copy and validation; hashing alone does not move records. Queries without a routing key may fan out across shards.

This design also has limits. A query for one tenant can target one shard, but a query across every tenant in the last hour may need to contact every shard. A single tenant with a very high event rate may overload its assigned shard even if the other tenants are evenly spread.

Before choosing a key, list the most important queries and ask:

- Does each query include the full partition key, or will it fan out?
- Does the key preserve the ordering needed by range scans?
- Can one tenant, account, or other key become much larger or hotter than the rest?
- Do records that need atomic updates land together?
- Can the key's ownership change without changing the record's identity?

There is rarely a key that makes every query local. The goal is to make the critical operations local while bounding the cost of the others.

## Range and hash placement

With **range partitioning**, boundaries map ordered key ranges to partitions. For example, customer IDs `0000–3fff` could belong to one partition and `4000–7fff` to another. Range placement supports ordered scans and can make time-based retention intuitive. It can also become skewed: newer records often arrive more frequently, so the newest time range may receive nearly all writes. A monotonically increasing ID can create the same right-edge hotspot.

With **hash partitioning**, a stable hash function maps a key to a bucket:

```text
bucket = hash(tenant_id) mod bucket_count
```

Hashing usually spreads distinct keys more evenly and avoids a single sequential range receiving every insert. The cost is that range queries over the original key no longer map to adjacent buckets. A query for all tenants in a time window may require fan-out, and the hash does not spread requests for one exceptionally hot tenant across multiple buckets.

| Placement strategy | Localizes | Common failure mode | Useful when |
| --- | --- | --- | --- |
| Range | Key intervals and ordered scans | Uneven ranges or a hot range, especially at the write edge | Range scans and range-local maintenance dominate |
| Hash | Individual keys across buckets | Fan-out for ranges; one hot key still maps to one place | Point access by key and broad key distribution dominate |
| Directory-based | Explicit key-to-owner lookup | Directory availability, cache invalidation, and lookup overhead | Placement needs operational control or special cases |

A directory can be combined with either range or hash placement. It trades a deterministic calculation for a maintained mapping, which can be useful when moving one large tenant without changing every other tenant's placement.

## What consistent hashing changes

Modulo hashing is compact, but changing the number of buckets reshuffles most keys. If the bucket count changes from `N` to `N + 1`, almost every key's remainder can change. Moving that much data makes scaling disruptive.

Consistent hashing instead maps both keys and node ownership onto a circular hash space. A key is assigned to the next node token on the ring. When a node is added or removed, only the keys in the affected ring intervals need new owners; keys in other intervals remain assigned as before.

![Two consistent-hashing rings show key K1 moving from node B to newly added node D, while K2 and keys in other intervals keep their owners](/articles/images/consistent-hashing-ring.svg "Consistent hashing ring before and after adding a node")

Figure 2: Each key walks clockwise to its first node token. Adding D splits the interval that previously belonged to B, so only keys in the new A-to-D interval change owner. The diagram illustrates placement only; the system still has to copy and validate those keys before routing is switched.

This limits *which keys need reassignment*. It does not copy the data, move connections, preserve transactions, or make the migration safe automatically. The system still needs a placement map and a protocol for moving ownership while reads and writes continue.

Early ring designs assign one token to each node, which can produce uneven ranges. **Virtual nodes** give each physical node multiple tokens so ownership is spread over more, smaller intervals. This improves balance in expectation and allows a larger node to own more tokens, but it adds metadata and does not guarantee balance for a skewed workload. Even perfectly balanced key counts do not imply balanced bytes, CPU, or request rates.

Some systems use other deterministic placement techniques, such as rendezvous hashing or jump consistent hashing, rather than a ring. The relevant property is how assignment changes when the node set changes—not whether the implementation literally draws a circle. Always evaluate the actual algorithm, weights, replication policy, and routing metadata used by the database.

### The bucket-count alternative

A common alternative is to hash into a fixed, larger set of logical buckets, then maintain a separate mapping from buckets to physical nodes:

```text
tenant_id -> hash -> logical bucket -> current shard
```

The number of logical buckets can stay stable while the bucket-to-shard map changes. Moving one bucket then requires updating that bucket's data and ownership, rather than changing the hash function for all records. This makes placement more explicit and can simplify incremental rebalancing, though the system must keep the mapping consistent and available.

## Rebalancing is a data migration

Changing a placement function is not the same as changing the data's owner. A safe move must account for writes that arrive while a range or bucket is being copied. A practical migration has an explicit state machine:

1. **Choose a bounded unit to move.** Record its old owner, destination, and placement version.
2. **Copy a snapshot.** Rate-limit the copy so it does not starve foreground traffic; make it restartable and check row counts or checksums.
3. **Capture concurrent changes.** Use a database change log, replication stream, or another ordered mechanism to apply writes made after the snapshot point.
4. **Catch up and validate.** Confirm the destination has applied changes through a known position and reconcile discrepancies.
5. **Switch ownership.** Update routing using a versioned map or controlled cutover. Define what stale routers do and how requests are forwarded or retried.
6. **Retire the source copy.** Keep a rollback window, then remove the old copy only when no supported reader or writer depends on it.

During the transition, define which copy is authoritative. Blindly writing to both locations can create divergent values when one write succeeds and the other fails. A forwarding rule, a single-writer epoch, or a change stream with idempotent application can make ownership clearer. Retries must not turn one logical operation into duplicate effects.

Moving data also needs operational headroom: source and destination I/O, temporary storage, replication bandwidth, and connection capacity. Throttle by observed impact, not just by a fixed copy rate. Track migration lag and per-shard latency, and make pause and resume safe.

## Hot keys are a different problem

Hashing spreads *different keys*. It cannot distribute one key's writes across nodes while preserving that key as a single, serializable record. If one tenant generates a large fraction of all traffic, changing from range partitioning to a hash of `tenant_id` still puts that tenant on one shard.

Possible mitigations change the data model or its semantics:

- Split a large tenant into independently addressable subkeys, such as `(tenant_id, time_bucket)` or `(tenant_id, region)`, if reads and writes can use that extra dimension.
- Keep append-heavy data partitioned by time and aggregate or query it asynchronously where strict immediate global totals are unnecessary.
- Isolate exceptionally large tenants onto dedicated shards using a directory or placement override.
- Cache or batch reads and writes when the workload permits it, while keeping the database as the source of truth.

Each option moves complexity elsewhere. Subkeys can turn a point read into a merge, dedicated placement needs lifecycle tooling, and asynchronous aggregation changes freshness guarantees. Monitor per-key and per-shard bytes, requests, queue depth, and tail latency; aggregate shard health alone can hide a single overloaded tenant.

## Replication, transactions, and query fan-out

Sharding and replication are orthogonal. Sharding divides ownership; replication copies a shard's data. A shard may have a leader and followers, but adding followers does not make writes for that shard independent. The system must define which replica serves reads, how stale those reads may be, and how failover preserves acknowledged writes.

Transactions spanning shards need coordination or weaker guarantees. A local transaction can atomically update records on one shard. An operation that updates multiple shards may require a distributed transaction, or it may be modeled as a saga with durable steps, retries, and compensating actions. Neither approach is free: distributed commit increases coordination and failure cases; sagas expose intermediate states and require recovery logic.

Queries that do not contain the routing key may fan out to many shards. A coordinator can merge sorted results or partial aggregates, but latency depends on the slowest participant and the result can consume significant network and memory. Put explicit limits on fan-out, result size, and deadlines. If a cross-shard query is business-critical, a separately maintained index or analytical store may be more suitable than repeatedly scanning the transactional fleet.

## Choosing a design

| Requirement | A reasonable starting point | Validate before committing |
| --- | --- | --- |
| Large table, but one database still has capacity | Local table partitioning | Whether queries prune partitions and maintenance improves |
| Point reads and writes can be routed by a stable key | Hash or bucket-based sharding | Skew, hot keys, and cross-shard query cost |
| Ordered range queries dominate | Range partitioning | Boundary balance and the write rate at range edges |
| Nodes change and most keys should keep their owner | Consistent or rendezvous hashing | Actual movement, node weighting, and data-copy procedure |
| Tenant sizes vary substantially | Directory-backed placement with tenant overrides | Lookup reliability, cache freshness, and tenant moves |

Do not shard solely because a dataset is large. First measure the actual bottleneck: storage capacity, write throughput, index size, lock contention, maintenance windows, or a query that cannot meet its latency target. Sharding adds routing, migrations, partial failure, and operational tooling; it is worthwhile when those costs address a demonstrated constraint.

### Key takeaways

- Partitioning divides data; sharding distributes ownership across database nodes; replication maintains copies.
- The partition key determines routing and shapes which queries stay local.
- Range placement preserves order but can skew; hash placement spreads keys but makes range access harder.
- Consistent hashing limits reassignment when membership changes, but it does not migrate data or solve hot keys.
- Safe rebalancing needs a copy, concurrent-change capture, validation, versioned cutover, and a rollback plan.
- Measure skew and fan-out at the key and shard level before choosing a placement scheme.

## References

- [PostgreSQL: Table Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [Dynamo: Amazon's Highly Available Key-value Store](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf)
- [Cassandra: Consistent Hashing](https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html)
- [Redis Cluster Specification: Hash Slots and Resharding](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/)
