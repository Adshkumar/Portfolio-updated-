---
title: "Linux System Internals: I/O Multiplexing, select, poll, and epoll"
description: "Understand Linux file descriptors and readiness notifications, then compare select, poll, and epoll and learn when each event-notification API fits."
slug: "linux-system-internals-io-multiplexing-select-poll-epoll"
date: "2026-10-26"
updated: "2026-11-02"
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

Servers often need to keep many sockets open even though only a few have data ready at any moment. I/O multiplexing lets one or a small number of threads wait for readiness across many file descriptors instead of dedicating a blocked thread to each connection.

On Linux, `select()`, `poll()`, and `epoll()` offer different interfaces for that job. The key distinction is how the application provides the set of descriptors and how much work is needed to find the ready ones—not a promise that a specific API makes every server fast.

![select and poll scan a supplied descriptor set, while epoll retains registrations and returns ready events](/articles/images/linux-epoll-io.svg "How Linux readiness APIs find sockets ready for I/O")

Figure 1: `select()` and `poll()` receive the watched set on each wait, whereas `epoll` keeps registrations in a kernel instance. `epoll` can avoid rescanning a large mostly idle set, but its costs still depend on activity and application work.

## The idea before the kernel details

Think of a server watching a thousand mailboxes. A thread-per-connection model assigns a person to wait beside every mailbox. Multiplexing instead asks a shared clerk to report which mailbox has something to collect. The application still has to read the data, handle partial reads and writes, and manage each connection's state.

“Ready” means an operation is likely to make progress without blocking; it does not mean that a complete request has arrived. Readiness can change before the application acts, so robust event loops use non-blocking sockets and handle `EAGAIN`/`EWOULDBLOCK`.

| API | How watched descriptors are supplied | Typical trade-off |
| --- | --- | --- |
| `select()` | Bit sets are supplied again on each call | Portable, but has descriptor-set limits on common implementations and scans the set |
| `poll()` | An array is supplied again on each call | Avoids `select()`'s fixed `fd_set` limit, but still scans the array |
| `epoll` | Descriptors are registered with a persistent kernel instance | Can avoid rescanning every watched descriptor when only a small subset is ready; registration and event-handling costs remain |

## The concurrency problem: Thread-per-connection vs event loops

In the early days of networked computing (the Apache 1.x model), servers handled concurrency using the **thread-per-connection** (or process-per-connection) pattern:

```c
// Blocking socket read
int client_fd = accept(server_fd, ...);
while ((bytes_read = read(client_fd, buf, sizeof(buf))) > 0) {
    process_request(buf);
}
```

When `read()` is invoked on a blocking socket with no data available, the calling thread waits until the operation can make progress, is interrupted, or reaches a configured timeout. Network receive processing and wakeups involve the kernel networking stack and driver; the exact interrupt, polling, and scheduling path depends on the device and system configuration.

### Thread-per-connection trade-offs
A thread-per-connection design can become constrained by per-thread stack address space and committed memory, scheduler overhead, and the number of simultaneously runnable threads. The actual cost depends on runtime, stack configuration, workload, and operating system; many mostly idle threads do not necessarily reserve their full stack size in physical RAM.

An event loop is one alternative: one or a few threads wait for readiness across many sockets, then dispatch work for those that can make progress. It trades per-connection blocked threads for explicit state management and non-blocking I/O; it is not automatically faster for every workload.

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
1. **Descriptor-set limit**: On glibc/Linux, `fd_set` is normally limited to descriptor numbers below `FD_SETSIZE` (commonly 1024). Do not pass an out-of-range descriptor to `FD_SET`.
2. **Repeated set processing**: The application supplies the sets again on each call, and the kernel examines the requested range up to `nfds`. The amount of work depends on that range, not simply the number of descriptors currently ready.
3. **User-space checks**: `select()` returns the number of ready descriptors, not a compact list of them, so the application typically tests its sets to find which descriptors are ready.

### 2. poll() (System V Unix, 1986)
`poll()` resolved the 1024 descriptor limit by passing an array of `struct pollfd` structures instead of fixed bitmasks:

```c
struct pollfd fds[1] = {
    { .fd = fd1, .events = POLLIN }
};

int ready_count = poll(fds, 1, timeout_ms);
```

`poll()` avoids `select()`'s fixed `fd_set` size, but the caller supplies an array on each wait and the kernel examines the array. This can make waiting expensive for a very large set when few descriptors are ready.

## The modern engine: epoll (Linux 2.6+)

Linux `epoll` separates descriptor registration from readiness waiting. It can avoid the repeated full-set scan used by `select()` and `poll()` when only a small subset of a large watched set is active, but there is no universal O(1) guarantee: registration, wakeups, the number of ready descriptors, and application work all contribute to cost.

`epoll` is implemented using three core system calls:

```text
epoll System Calls:
1. epoll_create1(0) ──> Creates an epoll instance
2. epoll_ctl(...)   ──> Adds, changes, or removes watched FDs
3. epoll_wait(...)  ──> Waits for and returns readiness events
```

### 1. epoll_create1(): Instantiating kernel state
```c
int epfd = epoll_create1(0);
```
Creates an `eventpoll` struct inside kernel memory. This struct outlives individual system calls and maintains the monitoring state.

### 2. epoll_ctl(): Stateful registration
```c
struct epoll_event ev;
ev.events = EPOLLIN | EPOLLET;
ev.data.fd = client_fd;
epoll_ctl(epfd, EPOLL_CTL_ADD, client_fd, &ev);
```
Instead of passing thousands of file descriptors on every call, the application registers each descriptor **once**. 

The kernel retains the registrations in the epoll instance, so the application does not need to resubmit the entire watched set on every wait. Kernel-internal data structures are implementation details and can change between Linux versions.

### 3. Readiness notification
The kernel tracks registered descriptors and makes readiness events available to `epoll_wait()`. The exact callbacks, queues, and wakeup path are Linux implementation details and can change between kernel versions:

```text
Kernel Event Flow:
1. I/O changes descriptor readiness.
2. The kernel records or signals readiness for the epoll instance.
3. epoll_wait() returns a batch of reported events to user space.
```

### 4. epoll_wait(): Waiting for ready descriptors
```c
struct epoll_event events[64];
int num_events = epoll_wait(epfd, events, 64, timeout_ms);
for (int i = 0; i < num_events; i++) {
    handle_io(events[i].data.fd);
}
```

When `epoll_wait()` is called:
- If no events are available, the thread can sleep until an event or timeout.
- The call returns a batch of events up to the supplied array capacity; user space then handles those events.
- **Performance**: The application can avoid inspecting every watched descriptor on each wait, but event delivery and handling still have costs that depend on readiness, registration, and workload.

## Level-Triggered (LT) vs. Edge-Triggered (ET) modes

`epoll` supports two fundamentally different event notification mechanisms:

### Level-Triggered (Default)
In **Level-Triggered (LT)** mode, `epoll_wait()` will repeatedly report a file descriptor as long as its underlying buffer has unread data:
1. 2000 bytes arrive on socket.
2. Application calls `epoll_wait()`, receives notification, and reads 500 bytes.
3. Application calls `epoll_wait()` again. Because 1500 bytes remain in the kernel buffer, `epoll_wait()` returns **immediately**.
- **Pros**: A descriptor remains reportable while it is ready, which is often simpler to use than edge-triggered notification. Applications must still handle errors, closure, and races correctly.

### Edge-Triggered (EPOLLET)
In **Edge-Triggered (ET)** mode, notifications indicate readiness transitions. If an application does not drain available data, it might not receive another notification until readiness changes again:
1. 2000 bytes arrive on socket.
2. Application calls `epoll_wait()`, receives notification, and reads 500 bytes.
3. Application calls `epoll_wait()` again. **It blocks indefinitely**, because no *new* state transition occurred, even though 1500 bytes remain unread!

### Using edge-triggered mode safely
When using `EPOLLET`:
- Sockets **must be configured as non-blocking** (`O_NONBLOCK`).
- The application **must read or write in a loop until `EAGAIN` or `EWOULDBLOCK` is returned**:

```c
while (1) {
    ssize_t bytes = read(fd, buf, sizeof(buf));
    if (bytes == -1) {
        if (errno == EAGAIN || errno == EWOULDBLOCK) {
            // No more data is available without waiting; safe to return to epoll_wait
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
| **Data Structure** | Fixed-size bit set | Array of `pollfd` structs | Persistent kernel-managed registrations |
| **Descriptor limit** | Commonly 1024 on glibc/Linux | No `fd_set`-style fixed set limit | Kernel and process resource limits apply |
| **Registration Model** | Stateless (pass every call) | Stateless (pass every call) | Stateful (register once via `ctl`) |
| **Wait behavior**| Scans the supplied set | Scans the supplied array | Returns ready events without a user-space full-set scan |
| **Output Format** | Scans all bits via `ISSET` | Scans entire array for `revents` | Dense array of ready events |
| **Trigger Modes** | Level-Triggered only | Level-Triggered only | Level-Triggered & Edge-Triggered |
| **Threading** | Coordinate concurrent access to shared sets | Coordinate concurrent access to shared arrays | Multiple threads can wait on an instance; event ownership and synchronization remain application concerns |

## Production tuning: System limits and gotchas

When running event loops on Linux, check the resource limits that apply to the actual process and workload before changing system settings:

1. **System-wide and Per-Process File Limits**:
   ```bash
   ulimit -n
   ```
2. **epoll resource bounds**:
   Registered descriptors consume kernel resources and are subject to per-user and system limits. Check the limits and accounting on the deployed kernel rather than relying on fixed per-watch memory figures.
3. **Multiple acceptors**:
   When several workers wait on a listening socket, wakeup behavior depends on kernel version and how the socket and epoll instances are configured. `EPOLLEXCLUSIVE` and `SO_REUSEPORT` are distinct mechanisms with different semantics; choose and test one for the deployment rather than treating them as interchangeable fixes.

### Takeaway
Use `select()` or `poll()` when their simpler interface and workload are a good fit. Consider `epoll` for Linux event loops with large, mostly idle descriptor sets, then benchmark the real workload. Whichever API you choose, non-blocking I/O, backpressure, partial operations, and correct connection cleanup remain essential.

## References

- [Linux man-pages: `select(2)`](https://man7.org/linux/man-pages/man2/select.2.html)
- [Linux man-pages: `poll(2)`](https://man7.org/linux/man-pages/man2/poll.2.html)
- [Linux man-pages: `epoll(7)`](https://man7.org/linux/man-pages/man7/epoll.7.html)
