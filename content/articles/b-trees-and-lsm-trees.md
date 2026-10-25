---
title: "B-Trees and LSM Trees: Choosing a Storage Engine"
description: "Follow a write from memory to disk, then compare read paths, write amplification, compaction, and the workloads each storage design favors."
slug: "b-trees-and-lsm-trees"
date: "2026-10-25"
tags:
  - Databases
  - Storage
  - Data Structures
category: "Data Structures"
difficulty: "advanced"
published: true
featured: true
author: "Adarsh Kumar"
cover: null
---

A database index is a promise about how quickly a key can be found. The structure underneath that promise determines how writes reach durable storage, how reads find recent changes, and how much background work the database must perform.

Two common designs make different trade-offs: **B-trees** update an ordered tree in place, while **log-structured merge trees (LSM trees)** turn writes into sequential records and merge sorted files later. Neither is universally faster. The right choice depends on the workload, storage medium, key distribution, and operational constraints.

## The storage problem

Updating a small value on disk can involve more than writing those bytes. A storage page may need to be read, changed, logged for crash recovery, and written back. If a page is full, inserting a key can split it and update parent pages too.

An LSM design takes another route: append each change to a sequential log and a memory-resident sorted structure, then persist sorted runs and merge them in the background. It makes the write path predictable, but reads and compaction must account for multiple runs.

The diagram compares the broad data paths. It is illustrative: individual database engines add their own caches, write-ahead logs, levels, indexes, and recovery rules.

![Side-by-side storage paths: B-tree page updates versus LSM memtable flushes and compaction](/articles/images/btree-lsm-storage.svg "Illustrative B-tree and LSM-tree write and read paths")

Figure 1: A B-tree keeps an ordered page structure, while an LSM tree accumulates sorted runs and merges them. The arrows show logical data movement, not a specific engine's exact I/O sequence.

In the B-tree path, the database locates a leaf page and changes the affected key range. When the leaf has room, the work remains local; when it does not, a split can propagate upward. A write-ahead log (WAL) commonly records changes before the corresponding data pages are considered durable, allowing recovery after a crash.

In the LSM path, a write is recorded in a log and applied to an in-memory sorted table. When memory fills, the table is flushed as an immutable sorted-string table (SSTable). Compaction merges SSTables, discards obsolete versions when safe, and may remove tombstones that represent deletes.

## How reads differ

A B-tree lookup descends from the root through separator keys until it reaches the leaf containing the target. With a well-maintained tree, its height grows logarithmically with the number of indexed keys. Internal pages can have many children, so the tree is typically shallow relative to a binary tree.

An LSM lookup has more places to check: the active memory table, immutable tables awaiting flush, and one or more on-disk levels. An engine can use indexes and Bloom filters to avoid unnecessary file reads, but a negative lookup may still consult several structures. Range scans can be efficient when data is laid out in sorted runs, although overlapping runs may require merging results.

The visible query latency therefore depends on details beyond the data structure name: cache hit rate, page size, levels, compaction policy, compression, Bloom-filter accuracy, and whether the query is point-based or scans a range.

## Write amplification and compaction

**Write amplification** is the amount of storage written relative to the logical bytes requested by an application. A B-tree can rewrite pages and log records during updates. An LSM tree may write a key repeatedly as files are flushed and compacted through levels. These are different sources of amplification, not a guarantee that one design always writes less.

Compaction also consumes CPU, disk bandwidth, and temporary space. If incoming write volume outpaces compaction for long enough, pending work grows and the engine may slow or throttle writes. Compaction can contend with foreground reads for I/O. Operations teams should watch compaction backlog, disk utilization, write stalls, cache hit rates, and tail latency rather than only average throughput.

## Workload fit

| Workload characteristic | B-tree tendency | LSM-tree tendency |
| --- | --- | --- |
| Read many point keys | Direct tree traversal; locality and cache matter | May consult multiple structures; filters and levels matter |
| Read ordered ranges | Natural ordered traversal | Sorted files support scans; overlapping runs may need merging |
| Sustain write-heavy ingestion | Page updates and splits are part of the write path | Sequential writes are attractive; compaction becomes ongoing work |
| Update existing keys | Local page updates are possible | New versions are appended and reconciled during compaction |
| Operational concern | Page contention, WAL, splits, and cache behavior | Compaction pressure, write stalls, and read amplification |

Treat this as a starting point for measurement, not a benchmark result. Different implementations of the same family can behave quite differently, and a database's transaction, replication, and cache layers affect the outcome.

## Failure and correctness considerations

Both families need a recovery protocol. A B-tree's page state and WAL ordering determine which committed changes survive a crash. LSM systems coordinate log durability with in-memory state and persisted files; they also need careful handling of sequence numbers, tombstones, and compaction so that an older value does not reappear after a delete.

For either design, test crash recovery and backup restore using the actual database, not a diagram. Monitor disk headroom: an LSM compaction may need room for both old and new files temporarily, while a B-tree also needs capacity for indexes, logs, and maintenance operations.

## A practical decision

Start with the access patterns: point lookups, ordered scans, write bursts, updates, and retention. Then determine whether the database lets you tune or observe the relevant behavior, and use representative data to measure latency percentiles and storage consumption. Include steady-state compaction or maintenance in the test rather than benchmarking only a short warm-up window.

An LSM engine is a reasonable candidate when high write throughput and sequential storage work fit the workload and the team can operate compaction. A B-tree is a common fit when predictable indexed reads, updates, and ordered traversal matter. Those are tendencies, not guarantees.

### Key takeaways

- B-trees maintain an ordered page structure and update it as keys change.
- LSM trees buffer and sort writes, then merge immutable files over time.
- LSM compaction trades background work and read complexity for a sequential write path.
- Write amplification, latency, and recovery behavior depend on the concrete engine and workload.
- Measure with realistic data, concurrency, cache state, and operational monitoring before choosing.

## References

- [PostgreSQL: Indexes](https://www.postgresql.org/docs/current/indexes.html)
- [RocksDB: Overview](https://github.com/facebook/rocksdb/wiki/RocksDB-Overview)
- [LevelDB: Implementation notes](https://github.com/google/leveldb/blob/main/doc/impl.md)
