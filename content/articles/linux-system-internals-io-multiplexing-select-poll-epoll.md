---
title: "Linux System Internals: I/O Multiplexing, select, poll, and epoll"
description: "A deep dive into the Linux kernel I/O subsystem, file descriptors, wait queues, readiness notifications, and why epoll scales to millions of concurrent connections."
slug: "linux-system-internals-io-multiplexing-select-poll-epoll"
date: "2026-10-26"
tags:
  - Linux
  - Operating Systems
  - Systems Programming
  - Concurrency
  - Architecture
category: "Architecture"
difficulty: "advanced"
published: true
featured: true
author: "Adarsh Kumar"
cover: null
---

High-concurrency servers—including NGINX, Redis, Envoy, Node.js (`libuv`), and Go's runtime network poller—routinely sustain hundreds of thousands of concurrent open connections on a single machine.

Achieving this throughput without spawning hundreds of thousands of operating system threads depends on a single foundational kernel primitive: **non-blocking I/O multiplexing**.

Understanding how the Linux kernel transitioned from blocking threads to `select()`, `poll()`, and ultimately `epoll()` reveals how operating systems manage file descriptors, hardware interrupts, and context-switching overheads under extreme scale.

![Kernel I/O Multiplexing: select vs epoll](/articles/images/linux-epoll-io.svg)

## The concurrency problem: Thread-per-connection vs event loops

In the early days of networked computing (the Apache 1.x model), servers handled concurrency using the **thread-per-connection** (or process-per-connection) pattern:

```c
// Blocking socket read
int client_fd = accept(server_fd, ...);
while ((bytes_read = read(client_fd, buf, sizeof(buf))) > 0) {
    process_request(buf);
}
```

When `read()` is invoked on a standard blocking socket:
1. If no network packet has arrived in the socket's receive buffer, the calling thread is placed into an `uninterruptible sleep` state (`TASK_UNINTERRUPTIBLE`).
2. The Linux kernel scheduler suspends the thread and performs a **context switch** to run another thread.
3. When the network interface card (NIC) receives an Ethernet frame, a hardware interrupt fires, the kernel places data into the socket buffer, and marks the thread runnable (`TASK_RUNNING`).

### Why thread-per-connection fails at scale (The C10K Problem)
When scaling to 50,000 or 100,000 connections:
- **RAM Overhead**: Each OS thread allocates a private execution stack (typically 2MB to 8MB in Linux, though virtualized). 50,000 threads consume 100GB+ of memory solely for idle stacks.
- **Context Switch Thrashing**: The kernel CPU scheduler spends more cycles saving and restoring CPU registers, cache lines, and TLB (Translation Lookaside Buffer) entries than running application code.
- **Idle Inefficiency**: In real-world web applications and WebSockets, over 95% of active connections are idle at any given millisecond, waiting for user input or database responses. Spawning an OS thread to sit idle on a socket is catastrophic for throughput.

The solution is an **event loop**: a single execution thread monitors thousands of sockets simultaneously, waking up only when a specific socket is ready for reading or writing.

## The legacy era: select() and poll()

The first generation of I/O multiplexing primitives allowed an application to ask the kernel: *"Which of these N file descriptors have data ready to read?"*

### 1. select() (BSD Unix, 1983)
`select()` uses fixed-size bitmasks (`fd_set`) where each bit represents a file descriptor index:

```c
fd_set read_fds;
FD_ZERO(&read_fds);
FD_SET(fd1, &read_fds);
FD_SET(fd2, &read_fds);

int ready_count = select(max_fd + 1, &read_fds, NULL, NULL, &timeout);
```

### Critical limitations of select():
1. **Hard Limit of 1024 File Descriptors**: The size of `fd_set` is governed by the kernel compile-time constant `FD_SETSIZE` (typically 1024). Any descriptor value $\ge 1024$ results in silent memory corruption or buffer overflows.
2. **O(N) Kernel Traversal**: On every single `select()` invocation, user space must copy the bitmasks into kernel memory. The kernel iterates linearly through all descriptors from `0` to `max_fd` to inspect their socket buffers.
3. **O(N) User-Space Traversal**: When `select()` returns, it does not tell the application *which* descriptors are ready. It only returns the count of ready descriptors. The user code must iterate through all descriptors and test `FD_ISSET(fd, &read_fds)`.

### 2. poll() (System V Unix, 1986)
`poll()` resolved the 1024 descriptor limit by passing an array of `struct pollfd` structures instead of fixed bitmasks:

```c
struct pollfd fds[10000];
fds[0].fd = fd1;
fds[0].events = POLLIN;

int ready_count = poll(fds, 10000, timeout_ms);
```

While `poll()` removed the arbitrary limit, it retained the same fundamental complexity: **O(N) copying and linear scanning on every iteration**. As the number of connections $N$ grows, CPU consumption scales linearly even if only 1 connection is active.

## The modern engine: epoll (Linux 2.6+)

Introduced in Linux kernel 2.5.44, **`epoll`** decoupled descriptor registration from readiness waiting, transforming the time complexity from **O(N)** to **O(1)** relative to the total number of monitored connections.

`epoll` is implemented using three core system calls:

```text
epoll System Calls:
1. epoll_create1(0) ──> Allocates kernel event instance
2. epoll_ctl(...)   ──> Adds/removes FDs in kernel Red-Black tree
3. epoll_wait(...)  ──> Sleeps until ready list is populated
```

### 1. epoll_create1(): Instantiating kernel state
```c
int epfd = epoll_create1(0);
```
Creates an `eventpoll` struct inside kernel memory. This struct outlives individual system calls and maintains the monitoring state.

### 2. epoll_ctl(): Stateful registration (The Red-Black Tree)
```c
struct epoll_event ev;
ev.events = EPOLLIN | EPOLLET;
ev.data.fd = client_fd;
epoll_ctl(epfd, EPOLL_CTL_ADD, client_fd, &ev);
```
Instead of passing thousands of file descriptors on every call, the application registers each descriptor **once**. 

The kernel stores monitored descriptors in a balanced **Red-Black Tree (`struct rb_root rbr`)**. Adding, modifying, or removing a descriptor takes **O(log N)** time, and lookups avoid linear memory copying.

### 3. Hardware interrupts and the Ready List (Doubly Linked List)
When an application calls `epoll_ctl(EPOLL_CTL_ADD)`, the kernel registers an internal callback function (`ep_poll_callback`) with the socket's internal waitqueue:

```text
Kernel Event Flow:
1. NIC receives packet ──> Triggers hardware interrupt
2. OS driver executes   ──> Appends data to socket sk_buff
3. Waitqueue callback   ──> Invokes ep_poll_callback()
4. Kernel adds socket   ──> Inserted into epoll Ready List (rdllist)
5. epoll_wait() unblocks──> Returns ONLY ready descriptors to user space
```

When network packets arrive at the network card:
1. The NIC driver handles the interrupt and parses the packet into the socket's receive buffer.
2. The socket's waitqueue triggers `ep_poll_callback()`.
3. The callback appends the ready descriptor to the `eventpoll`'s **Ready List (`struct list_head rdllist`)**, a doubly linked list of sockets that have active events.
4. If a thread is sleeping inside `epoll_wait()`, the kernel wakes it immediately.

### 4. epoll_wait(): O(1) event retrieval
```c
struct epoll_event events[64];
int num_events = epoll_wait(epfd, events, 64, timeout_ms);
for (int i = 0; i < num_events; i++) {
    handle_io(events[i].data.fd);
}
```

When `epoll_wait()` is called:
- If the ready list is empty, the thread sleeps on the `eventpoll` waitqueue.
- As soon as descriptors become ready, the kernel transfers items directly from the ready list to the user-space `events` array.
- **Performance**: Execution time depends solely on the number of *ready events* (e.g., 5 ready sockets), completely independent of whether 1,000 or 1,000,000 sockets are currently open.

## Level-Triggered (LT) vs. Edge-Triggered (ET) modes

`epoll` supports two fundamentally different event notification mechanisms:

### Level-Triggered (Default)
In **Level-Triggered (LT)** mode, `epoll_wait()` will repeatedly report a file descriptor as long as its underlying buffer has unread data:
1. 2000 bytes arrive on socket.
2. Application calls `epoll_wait()`, receives notification, and reads 500 bytes.
3. Application calls `epoll_wait()` again. Because 1500 bytes remain in the kernel buffer, `epoll_wait()` returns **immediately**.
- **Pros**: Intuitive, programming-model safe. Missed events are impossible.

### Edge-Triggered (EPOLLET)
In **Edge-Triggered (ET)** mode, `epoll_wait()` generates a notification **only when the state changes** (e.g., when new data arrives on an empty buffer):
1. 2000 bytes arrive on socket.
2. Application calls `epoll_wait()`, receives notification, and reads 500 bytes.
3. Application calls `epoll_wait()` again. **It blocks indefinitely**, because no *new* state transition occurred, even though 1500 bytes remain unread!

### The Edge-Triggered contract
When using `EPOLLET` (used by NGINX and high-performance network runtimes):
- Sockets **must be configured as non-blocking** (`O_NONBLOCK`).
- The application **must read or write in a loop until `EAGAIN` or `EWOULDBLOCK` is returned**:

```c
while (1) {
    ssize_t bytes = read(fd, buf, sizeof(buf));
    if (bytes == -1) {
        if (errno == EAGAIN || errno == EWOULDBLOCK) {
            // Buffer completely drained; safe to resume epoll_wait
            break;
        }
        handle_error(fd);
        break;
    } else if (bytes == 0) {
        // Peer closed connection
        close(fd);
        break;
    }
    process_payload(buf, bytes);
}
```

## Epoll architecture summary

| Property | select() | poll() | epoll |
| --- | --- | --- | --- |
| **Data Structure** | Fixed-size bitmask | Array of `pollfd` structs | Red-Black Tree + Linked List |
| **Max Connections** | 1024 (`FD_SETSIZE`) | Unbounded (memory limit) | Millions (file-max sysctl) |
| **Registration Model** | Stateless (pass every call) | Stateless (pass every call) | Stateful (register once via `ctl`) |
| **Kernel Complexity**| O(N) linear scan | O(N) linear scan | O(1) wait queue callbacks |
| **Output Format** | Scans all bits via `ISSET` | Scans entire array for `revents` | Dense array of ready events |
| **Trigger Modes** | Level-Triggered only | Level-Triggered only | Level-Triggered & Edge-Triggered |
| **Thread Safety** | Requires application lock | Requires application lock | Safe across threads (`epoll_ctl`) |

## Production tuning: System limits and gotchas

When running large-scale event loops on Linux, ensure system kernel parameters are tuned:

1. **System-wide and Per-Process File Limits**:
   ```bash
   sysctl -w fs.file-max=2097152
   ulimit -n 1048576
   ```
2. **epoll Resource Bounds**:
   The kernel tracks max registered epoll descriptors per user via `fs.epoll.max_user_watches` (each watch consumes 90 bytes on 32-bit and 160 bytes on 64-bit systems).
3. **The Epoll Thundering Herd**:
   When multiple worker threads or processes call `epoll_wait()` on the same listening socket, an incoming connection previously woke *all* processes, triggering CPU contention as only one succeeded in calling `accept()`. Modern Linux kernels resolve this via the **`EPOLLEXCLUSIVE`** flag or `SO_REUSEPORT`.

### Takeaway
By combining an in-kernel Red-Black tree for efficient descriptor management with interrupt-driven waitqueue callbacks that maintain an active ready list, Linux `epoll` provides the high-performance foundation enabling modern distributed infrastructure to scale seamlessly to millions of concurrent sessions.
