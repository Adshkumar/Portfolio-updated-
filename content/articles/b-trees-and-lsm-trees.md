---
title: "B-Trees and LSM Trees: Choosing a Storage Engine"
description: "Follow a write from memory to disk, then compare read paths, write amplification, compaction, and the workloads each storage design favors."
slug: "b-trees-and-lsm-trees"
date: "2026-10-25"
updated: "2026-11-02"
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

A storage engine translates logical reads and writes into physical work on persistent media. Underneath the SQL or key-value interface, every engine balances **write amplification** (extra data written), **read amplification** (extra data examined), and **space amplification** (extra storage occupied). The RUM conjecture is a useful way to reason about trade-offs among these costs, not a rule that every design can optimize exactly two.

Two broad storage-engine designs make different trade-offs:
1. **B-tree-family indexes** (for example, PostgreSQL and InnoDB B-tree indexes): Keep keys ordered in pages, which supports point lookups and range scans. Database updates still interact with the engine's transaction, logging, and page-management rules; “in place” does not mean a row is simply overwritten on disk.
2. **Log-structured merge (LSM) designs** (for example, RocksDB, LevelDB, and Cassandra): Buffer and sort writes, then flush immutable files and compact them in the background. This can make write paths efficient, while adding read amplification and compaction work.

The best choice depends on the actual engine, workload, durability settings, cache behavior, and hardware. Trace and benchmark the relevant read and write paths instead of choosing from a data-structure label alone.

## The idea before the implementation

Think of a database as a library that must both find a book quickly and file new books efficiently. A B+ Tree keeps an ordered index and updates pages in place, which makes point lookups and range scans straightforward. An LSM tree first records writes in memory and on a log, then sorts and merges disk files in the background. That can make sustained writes efficient, but reads and compaction must account for multiple file layers.

Choose by workload rather than by label. A workload dominated by point lookups and ordered scans may favor a B+ Tree. A write-heavy workload that can tolerate background compaction and tune its read path may favor an LSM design. Real engines add caches, logs, indexes, and workload-specific optimizations, so benchmark representative data before deciding.

## The mechanical reality of storage I/O

Databases and storage devices move data in pages or blocks, so a small logical update can involve larger physical reads, log writes, and later page writes. The sizes and write paths depend on the database, filesystem, device, and configuration; there is no one universal “record update” I/O sequence.

![Side-by-side storage paths: B-tree page updates versus LSM memtable flushes and compaction](/articles/images/btree-lsm-storage.svg "Illustrative B-tree and LSM-tree write and read paths")

Figure 1: Comparison of primary write and read paths. A B-tree modifies structured disk pages in place via a dirty buffer pool backed by a WAL. An LSM tree directs writes sequentially to an active memory table (Memtable) and a WAL, periodically flushing immutable runs (SSTables) to disk and relying on asynchronous background compaction to merge runs and purge obsolete records.

## B+ Tree storage architecture

Modern databases implement the **B+ Tree** variant rather than the classic B-tree. In a common B+ tree layout:
- **Internal nodes** hold routing keys and child-page references.
- **Leaf pages** hold index entries and, depending on the engine and index type, row data or references to rows stored elsewhere.
- Leaf pages are linked in key order in many implementations, allowing range scans to move between adjacent pages.

```text
[Interior Routing Node]
  ├── Ptr 1 (< 100)   --> [Leaf Page 1: Keys 1..99   | Data]
  ├── Ptr 2 (100..199)--> [Leaf Page 2: Keys 100..199| Data]
  └── Ptr 3 (>= 200)  --> [Leaf Page 3: Keys 200..299| Data]

(Many B+ tree implementations link leaf pages in key order.)
```

### Example page layout: PostgreSQL heap pages

Within fixed-size pages, engines use page-specific layouts. PostgreSQL heap pages use a **slotted-page** layout for variable-length tuples:
1. **Page header**: Includes page metadata such as the page LSN and boundaries for line pointers and free space.
2. **Line-pointer array**: Grows after the header. Each entry points to a tuple location on the page.
3. **Free Space Window**: The unallocated boundary between the slot array and the tuple data.
4. **Tuple storage**: Grows from the end of the page toward the line-pointer array.

```text
+--------------------------------------------------+
| Page Header (LSN, Tx Slots, Free Space Pointer)  |
+--------------------------------------------------+
| Slot 0 (Offset: 8140) | Slot 1 (Offset: 8020)    |
+--------------------------------------------------+
|            --- Free Space Window ---             |
+--------------------------------------------------+
| Tuple 1 (Offset: 8020, 120 bytes)                |
+--------------------------------------------------+
| Tuple 0 (Offset: 8140, 52 bytes)                 |
+--------------------------------------------------+
```

This heap-page example is not the physical layout of every B-tree page. When an index page cannot fit a new entry, an implementation may split the page and update its parent. The exact split policy, amount of data moved, and concurrency control are engine-specific; a row update does not necessarily split a B-tree page.

### Fanout and tree depth mathematics

Because interior pages carry only keys and child pointers, B+ Trees achieve an exceptionally high branching factor (fanout `B`).

If an internal page can reference `B` child pages, a balanced tree with height `h` can address on the order of `B^h` leaves. Real fanout depends on key and pointer sizes, page layout, fill, and engine metadata. This explains why tree height is often small, but it does not predict physical I/O: upper pages may be cached, while cache misses, visibility checks, and secondary-index lookups can add work.

### Concurrency control: Latching vs. Locking

B+ Trees separate logical transaction locks (which protect row content for the duration of a transaction) from physical **page latches** (short-lived mutexes or rwlocks that protect in-memory page structure during pointer dereferencing):
- **Latch crabbing (coupling)**: A reader acquires a shared read latch on the parent, acquires a shared read latch on the child, and only then releases the parent latch.
- **Optimistic latching**: Readers traverse down using page version counters without acquiring shared latches, verifying that the version counter has not changed before accessing page slots.
- **Write contention**: Monotonically increasing keys can concentrate inserts near the right edge of an index. Whether that becomes a bottleneck depends on the engine's page and concurrency design.

## LSM Tree storage architecture

Log-Structured Merge Trees discard in-place disk updates entirely. Instead of seeking to existing pages on disk, an LSM tree transforms random writes into sequential disk operations.

An LSM engine commonly consists of:
1. **Memtable (In-Memory)**: A concurrent sorted data structure (typically a SkipList or Red-Black Tree) where active writes, updates, and deletes (tombstones) are inserted.
2. **Write-Ahead Log (WAL)**: A log used to recover recent writes. Whether a write is durable before acknowledgment depends on the engine's sync and durability configuration.
3. **Sorted String Tables (SSTables)**: Immutable files on disk structured in hierarchical levels (Level 0, Level 1, ..., Level K).

```text
Writes ---> [ WAL ] (sequential disk append)
       ---> [ Memtable ] (RAM skip-list)
                  │
                  ▼ (when full, e.g. 64MB)
            [ Immutable Memtable ]
                  │
                  ▼ (background flush)
       Level 0: [ SSTable A ] [ SSTable B ]
                  │ (compaction)
       Level 1: [ SSTable 1 ] [ SSTable 2 ] [ SSTable 3 ]
```

### The SSTable physical structure

An SSTable is an immutable file ordered by key. Internally, an SSTable (such as RocksDB's BlockBasedTable format) contains:
- **Data Blocks**: Chunks of sorted key-value pairs (typically 4 KB to 64 KB), compressed with LZ4 or Zstandard. Delta encoding is applied to consecutive keys to minimize size.
- **Filter Block**: A vectorized Bloom filter that allows point lookups to skip reading the data blocks entirely if the key is not present.
- **Index Block**: Contains the last key of every data block and the physical file offset of that block.
- **Footer**: A fixed-size trailer at the end of the file storing magic numbers and offsets to the index and meta blocks.

```text
+--------------------------------------------------+
| Data Block 0 (delta-encoded KV pairs, compressed)|
+--------------------------------------------------+
| Data Block 1 (delta-encoded KV pairs, compressed)|
+--------------------------------------------------+
| Filter Block (Bloom filter bit arrays)           |
+--------------------------------------------------+
| Index Block (Separator keys -> block offsets)    |
+--------------------------------------------------+
| Meta Index Block                                 |
+--------------------------------------------------+
| Footer (Fixed size: points to Index/Meta offsets)|
+--------------------------------------------------+
```

### Compaction mechanics: Leveled vs. Size-Tiered

Because SSTables are immutable, updates do not overwrite older values; they append a newer version with a higher sequence number. Deletions append a **tombstone** marker.

Over time, disk usage expands and read queries must check multiple files. **Compaction** is the asynchronous process that reads multiple sorted files, merges them via multi-way merge sort, discards overwritten versions and expired tombstones, and emits new sorted files.

Two primary compaction algorithms exist:

#### 1. Leveled compaction
- Levels are managed with size and overlap targets that depend on the engine and configuration.
- In Level 0, keys can overlap between files because Level 0 files are direct dumps of memtables.
- In Level 1 and higher, keys within the same level are strictly disjoint (non-overlapping).
- When level `Li` exceeds its capacity limit, one or more files from `Li` are merged with all overlapping files in `Li+1`.
- **Trade-off**: Can bound overlap and make reads more predictable, at the cost of rewriting data during compaction. Write and space amplification depend on workload and configuration.

#### 2. Size-tiered compaction
- Accumulates SSTables of similar sizes within a tier. When a threshold (e.g., 4 files) is reached, all 4 files are merged into a single larger SSTable in the next tier.
- Files within every tier have overlapping key ranges.
- **Trade-off**: Can reduce rewrite work in some workloads, while overlapping files can increase read amplification and temporary disk-space requirements. Exact behavior depends on the engine and compaction strategy.

### Bloom filter mathematics for LSM reads

Without optimizations, reading a key from an LSM tree would require checking every level on disk, resulting in terrible read amplification.

To eliminate disk reads for absent keys, each SSTable includes a **Bloom filter**—a space-efficient probabilistic data structure.

Given `n` keys and a filter allocated `m` bits with `k` independent hash functions, the false positive probability `p` is:
`p ≈ (1 - e^(-k*n/m))^k`

The optimal number of hash functions minimizing false positives for a given bit-budget per key (`m/n`) is:
`k = (m/n) * ln(2) ≈ 0.693 * (m/n)`

At 10 bits per key (`m/n = 10`), choosing `k = 7` yields:
`p ≈ (0.5)^7 ≈ 0.0078  (~0.8% false positive rate)`

A 0.8% false positive rate means that over 99% of point reads for keys not present in an SSTable are rejected in RAM before reading disk blocks.

## Quantitative comparison

| Metric / Dimension | B+ Tree (e.g., InnoDB, WiredTiger) | LSM Tree (e.g., RocksDB, Cassandra) |
| --- | --- | --- |
| **Write amplification** | Depends on page layout, indexes, WAL, and update pattern | Depends on compaction strategy, write pattern, and configuration |
| **Write path** | Updates and inserts modify indexed pages and produce recovery records | Writes are commonly logged and buffered before immutable files are flushed |
| **Point reads** | Traverse an ordered index; cache misses and row visibility add work | May consult memory and multiple files; filters and caches can reduce file reads |
| **Range scans** | Ordered index traversal can be efficient for matching ranges | May merge sorted data from memory and files |
| **Space use** | Includes page slack, indexes, and old row versions as applicable | Includes obsolete versions, tombstones, and compaction overlap |
| **Operational costs** | Page splits, cache pressure, and vacuum/maintenance behavior vary by engine | Compaction competes for I/O and may throttle writes when it falls behind |

## Production failure modes and operational realities

### 1. LSM write stalls and compaction debt
In an LSM tree, foreground writes enter RAM while background threads perform compaction. If the incoming write rate exceeds the background I/O bandwidth:
- Uncompacted Level 0 files accumulate.
- Because Level 0 files have overlapping key ranges, every read query must check every Level 0 file.
- To prevent reads from collapsing, the engine deliberately **throttles or pauses foreground writes** (a write stall).

**Mitigation**:
- Dedicate separate NVMe drives for WAL and data directories.
- Configure background thread pool priorities: separate flush threads (RAM to Level 0) from compaction threads (`Li` to `Li+1`).
- Set `max_background_compactions` proportional to available CPU cores and storage IOPS.

### 2. B+ Tree page split latency spikes
Page splits require synchronization and can add write work. Their latency impact depends on the engine's split and latch strategy, workload, and contention; a split does not necessarily block every operation through the tree.

**Mitigation**:
- Treat fill-factor and index-maintenance settings as engine-specific controls. Tune them only after measuring page splits, fragmentation, and update patterns.

### 3. Tombstone accumulation in LSM scans
Deleting records in an LSM tree appends tombstone markers. If an application writes millions of rows and then deletes them, a subsequent range scan must read and filter millions of tombstone records across multiple SSTables before returning valid data. This creates massive read amplification and can cause query timeouts.

**Mitigation**:
- Enable aggressive tombstone-triggered compaction (`compaction_options` in Cassandra or `table_properties` in RocksDB).
- Avoid anti-patterns that treat LSM trees as high-throughput ephemeral FIFO queues.

## Architectural decision matrix

Consider a **B-tree-family index** when:
- Ordered point lookups and range scans are important access patterns.
- The database's transaction and indexing features fit the application's consistency requirements.
- Benchmarks show its read/write path meets latency and capacity goals.

Select an **LSM Tree storage engine** when:
- The workload has substantial writes and the engine's compaction behavior fits available CPU, I/O, and storage headroom.
- The application can tolerate and tune the read amplification and compaction trade-offs.
- Benchmark results for the actual key distribution and query mix are favorable.

### Key takeaways

- B-tree-family indexes keep keys ordered and can support efficient range scans; page behavior and write costs vary by engine.
- LSM designs buffer and merge sorted data, trading compaction work and possible read amplification for a write path that may fit ingest-heavy workloads.
- Compare measured latency, durability, write/read/space amplification, and recovery behavior on representative data—not just asymptotic complexity or family-level averages.

## References

- [PostgreSQL Documentation: Chapter 64. B-Tree Indexes](https://www.postgresql.org/docs/current/btree.html)
- [MySQL Internals: InnoDB Page Structure](https://dev.mysql.com/doc/internals/en/innodb-page-structure.html)
- [RocksDB Documentation: Compaction and Architecture Overview](https://github.com/facebook/rocksdb/wiki)
- [Goetz Graefe: Modern B-Tree Techniques (Foundations and Trends in Databases)](https://dl.acm.org/doi/10.1561/1900000028)
- [Patrick O'Neil, Edward O'Neil, Gerhard Weikum: The Log-Structured Merge-Tree (LSM-tree)](https://www.cs.umb.edu/~poneil/lsmtree.pdf)
