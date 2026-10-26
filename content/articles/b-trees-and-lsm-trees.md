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

A storage engine translates logical reads and writes into physical blocks on non-volatile media. Underneath the SQL or key-value interface, every engine balances three competing pressures: **write amplification, read amplification, and space amplification** (the RUM conjecture). You can optimize for at most two at the expense of the third.

Two primary data structure families dominate production databases:
1. **B+ Trees** (found in PostgreSQL, MySQL InnoDB, SQLite, Oracle): In-place update engines that prioritize predictable, low-latency point reads and sequential range scans.
2. **Log-Structured Merge Trees (LSM Trees)** (found in RocksDB, Apache Cassandra, ScyllaDB, ClickHouse, LevelDB): Out-of-place, append-only engines that prioritize high sustained write throughput and dense compression at the cost of background compaction work and read complexity.

Selecting the right storage engine requires tracing the exact I/O path of writes and reads from operating system page caches down to NVMe blocks.

## The mechanical reality of storage I/O

Modifying a single 32-byte record on disk is never a 32-byte operation. Storage media operate in discrete block units:
- **Operating system virtual memory**: Manages 4 KB pages.
- **Relational database buffer pools**: Manage 8 KB (PostgreSQL) or 16 KB (InnoDB) pages.
- **Solid State Drives (SSDs)**: Read and program in 4 KB to 16 KB flash pages, but can only erase in large blocks of 2 MB to 8 MB.

When a database performs an in-place modification of a single field, it reads an entire 16 KB page into memory, applies the delta, writes a sequential recovery record to the Write-Ahead Log (WAL), and eventually flushes the entire 16 KB page back to disk.

![Side-by-side storage paths: B-tree page updates versus LSM memtable flushes and compaction](/articles/images/btree-lsm-storage.svg "Illustrative B-tree and LSM-tree write and read paths")

Figure 1: Comparison of primary write and read paths. A B-tree modifies structured disk pages in place via a dirty buffer pool backed by a WAL. An LSM tree directs writes sequentially to an active memory table (Memtable) and a WAL, periodically flushing immutable runs (SSTables) to disk and relying on asynchronous background compaction to merge runs and purge obsolete records.

## B+ Tree storage architecture

Modern databases implement the **B+ Tree** variant rather than the classic B-tree. In a B+ Tree:
- **Interior nodes** store only routing keys and child page pointers. They carry no user data.
- **Leaf nodes** store keys along with full row data (clustered index) or heap tuple pointers (secondary index).
- Leaf pages form a doubly-linked list, enabling efficient range scans without traversing back up to interior pages.

```text
[Interior Routing Node]
  ├── Ptr 1 (< 100)   --> [Leaf Page 1: Keys 1..99   | Data]
  ├── Ptr 2 (100..199)--> [Leaf Page 2: Keys 100..199| Data]
  └── Ptr 3 (>= 200)  --> [Leaf Page 3: Keys 200..299| Data]

(Leaf pages are doubly linked: Page 1 <-> Page 2 <-> Page 3)
```

### Slotted-page physical layout

Within each fixed-size page (e.g., 8 KB or 16 KB), engines use a **slotted-page architecture** to handle variable-length keys and attributes without fragmentation:
1. **Page Header**: Contains page LSN (Log Sequence Number for crash recovery), free space pointers, transaction slots, and slot counts.
2. **Slot Array (Line Pointers)**: Grows from the top down. Each slot contains a byte offset pointing to a tuple location and tuple length.
3. **Free Space Window**: The unallocated boundary between the slot array and the tuple data.
4. **Tuple Storage**: Grows from the bottom of the page up.

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

When an existing row is updated with a larger value that exceeds available page space, the engine must split the page:
1. A new leaf page is allocated.
2. Roughly half the keys and tuples are copied to the new sibling page.
3. The parent interior node is updated with a new separator key and pointer.
4. If the parent page is full, the split cascades upward toward the root, temporarily serializing concurrent operations along the path.

### Fanout and tree depth mathematics

Because interior pages carry only keys and child pointers, B+ Trees achieve an exceptionally high branching factor (fanout `B`).

Given:
- Page size: 16 KB (16,384 bytes)
- Average key + pointer overhead: 32 bytes
- Effective fill factor (70% after page splits): `B = (16,384 * 0.70) / 32 ≈ 358`

The height `h` of a tree storing `N` records:
`h <= ceil(log_B(N / B_leaf)) + 1`

With a fanout of ~350, a 3-level tree indexes:
`350 * 350 * 100 ≈ 12,250,000 records`

A 4-level tree indexes over 4.2 billion records.

Because the root page and first-level interior nodes reside permanently in RAM, resolving any arbitrary point read requires at most **1 to 2 physical disk I/O operations**.

### Concurrency control: Latching vs. Locking

B+ Trees separate logical transaction locks (which protect row content for the duration of a transaction) from physical **page latches** (short-lived mutexes or rwlocks that protect in-memory page structure during pointer dereferencing):
- **Latch crabbing (coupling)**: A reader acquires a shared read latch on the parent, acquires a shared read latch on the child, and only then releases the parent latch.
- **Optimistic latching**: Readers traverse down using page version counters without acquiring shared latches, verifying that the version counter has not changed before accessing page slots.
- **Write contention**: When multiple transactions insert monotonically increasing keys (e.g., auto-incrementing IDs or UUIDv7), they all contend on the exact same rightmost leaf page, creating page latch bottlenecks.

## LSM Tree storage architecture

Log-Structured Merge Trees discard in-place disk updates entirely. Instead of seeking to existing pages on disk, an LSM tree transforms random writes into sequential disk operations.

An LSM tree consists of three primary components:
1. **Memtable (In-Memory)**: A concurrent sorted data structure (typically a SkipList or Red-Black Tree) where active writes, updates, and deletes (tombstones) are inserted.
2. **Write-Ahead Log (WAL)**: An append-only sequential log on disk that guarantees durability across crashes before an entry is acknowledged.
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

#### 1. Leveled Compaction (Default in RocksDB, LevelDB)
- Each level has a strict maximum capacity (e.g., L1 = 10 MB, L2 = 100 MB, L3 = 1 GB, with a growth multiplier T = 10).
- In Level 0, keys can overlap between files because Level 0 files are direct dumps of memtables.
- In Level 1 and higher, keys within the same level are strictly disjoint (non-overlapping).
- When level `Li` exceeds its capacity limit, one or more files from `Li` are merged with all overlapping files in `Li+1`.
- **Trade-off**: Higher write amplification (`W_A ≈ 10 * levels`), but strictly bounded space amplification (`S_A ≈ 1.11`) and predictable point-read performance.

#### 2. Size-Tiered Compaction (Default in Cassandra for write-heavy workloads)
- Accumulates SSTables of similar sizes within a tier. When a threshold (e.g., 4 files) is reached, all 4 files are merged into a single larger SSTable in the next tier.
- Files within every tier have overlapping key ranges.
- **Trade-off**: Lower write amplification, but high space amplification. The database may require up to 50% free disk headroom just to complete a compaction of the largest tier, and point reads may need to search multiple files per tier.

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
| **Write Amplification (W_A)** | High for random writes (10x–60x due to full page writes) | Moderate to High (10x–30x in Leveled; 4x–8x in Size-Tiered) |
| **Write Throughput** | Bound by random disk I/O and page latch contention | Sustained high throughput; writes are sequential WAL + RAM |
| **Point Read Latency** | Predictable (`O(log_B N)`, typically 1–2 page reads) | Highly variable; depends on Bloom filter hits and block cache |
| **Range Scan Latency** | Optimal; contiguous leaf node scans via linked pages | Requires multi-way heap merge across Memtable and all levels |
| **Space Amplification (S_A)**| 1.3x–2.0x (internal fragmentation, fill factor ~70%) | 1.1x–1.2x in Leveled; up to 2.0x in Size-Tiered (tombstones & obsolete versions) |
| **Storage Fragmentation** | High over time; requires periodic `OPTIMIZE TABLE` / `VACUUM` | Minimal; compaction continuously packs data into dense sequential files |
| **SSD Wear & Write Endurance**| High wear due to repeated partial-page updates | Predictable sequential writes allow better SSD wear leveling |
| **Operational Hotspots** | Right-edge append latch contention on monotonic keys | Background compaction write stalls during sudden write bursts |

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
Under high concurrency, when a leaf page fills up and splits, the thread must acquire an exclusive latch on the leaf and its parent interior node. If the parent also splits, the exclusive latch propagates upward toward the root. During this cascade, all reads and writes passing through those nodes are blocked, resulting in tail latency (p99.9) spikes.

**Mitigation**:
- Choose fill factors intentionally: set fill factor to 75%–85% for random-insert tables to leave headroom for updates.
- For monotonic append workloads, use engines that support right-split optimizations (e.g., InnoDB automatically allocates a new empty page without splitting the current page in half when inserts are strictly sequential).

### 3. Tombstone accumulation in LSM scans
Deleting records in an LSM tree appends tombstone markers. If an application writes millions of rows and then deletes them, a subsequent range scan must read and filter millions of tombstone records across multiple SSTables before returning valid data. This creates massive read amplification and can cause query timeouts.

**Mitigation**:
- Enable aggressive tombstone-triggered compaction (`compaction_options` in Cassandra or `table_properties` in RocksDB).
- Avoid anti-patterns that treat LSM trees as high-throughput ephemeral FIFO queues.

## Architectural decision matrix

Select a **B+ Tree storage engine** when:
- The workload is **read-dominated** (>70% reads) with strict, predictable low-latency requirements for both point queries and ordered range scans.
- You require complex multi-statement **ACID transactions** with strict serializability, where foreign-key constraints and secondary index latches are verified synchronously.
- Memory is sufficient to hold the active working set's interior routing pages in the buffer pool.

Select an **LSM Tree storage engine** when:
- The workload is **write-heavy or ingest-dominated** (time-series events, logging, append-mostly audit trails, metrics, large-scale messaging).
- High compression ratios and space efficiency are paramount to reduce NVMe storage costs across petabyte-scale clusters.
- Data is predominantly queried by primary key lookup using Bloom filters or processed in bulk sequential analytical passes.

### Key takeaways

- In-place B+ Trees minimize read amplification and make range traversals trivial by linking physical leaf pages, but pay high write amplification on random updates.
- Out-of-place LSM trees convert random writes into sequential appends, trading background compaction I/O and Bloom filter memory for superior write throughput.
- Storage performance is governed by physical block sizes, page latching contention, buffer pool churn, and SSD write endurance—not just big-O search complexity.

## References

- [PostgreSQL Documentation: Chapter 64. B-Tree Indexes](https://www.postgresql.org/docs/current/btree.html)
- [MySQL Internals: InnoDB Page Structure](https://dev.mysql.com/doc/internals/en/innodb-page-structure.html)
- [RocksDB Documentation: Compaction and Architecture Overview](https://github.com/facebook/rocksdb/wiki)
- [Goetz Graefe: Modern B-Tree Techniques (Foundations and Trends in Databases)](https://dl.acm.org/doi/10.1561/1900000028)
- [Patrick O'Neil, Edward O'Neil, Gerhard Weikum: The Log-Structured Merge-Tree (LSM-tree)](https://www.cs.umb.edu/~poneil/lsmtree.pdf)
