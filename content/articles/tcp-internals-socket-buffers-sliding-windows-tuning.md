---
title: "TCP Internals: Socket Buffers, Sliding Windows, and Kernel Tuning"
description: "How the Linux kernel manages TCP connections: socket queues, sliding windows, flow control, congestion avoidance, and high-throughput tuning."
slug: "tcp-internals-socket-buffers-sliding-windows-tuning"
date: "2026-10-26"
updated: "2026-11-02"
tags:
  - Networking
  - TCP
  - Linux
  - Systems Programming
  - Reliability
category: "Infrastructure"
difficulty: "advanced"
published: true
featured: false
author: "Adarsh Kumar"
cover: null
---

TCP gives applications a reliable, ordered byte stream between two endpoints. It hides packet boundaries: an application writes bytes, and TCP retransmits missing data and controls how much it sends based on both receiver capacity and network congestion.

The kernel's send and receive queues are part of that work, but a slow request is not automatically a socket-buffer problem. Application processing, congestion, routing, receiver behavior, and connection reuse can all contribute. This article follows the bytes and explains which measurements help distinguish those causes.

![TCP byte flow from the sender's send queue through the network to the receiver's buffer, with acknowledgements and receive and congestion windows](/articles/images/tcp-kernel-buffers.svg "TCP byte flow, acknowledgements, and independent flow/congestion limits")

Figure 1: The sender retains sent bytes until they are acknowledged. The receiver advertises available buffer space as `rwnd`, while the sender's congestion algorithm limits in-flight data with `cwnd`; the smaller window constrains transmission.

## Start with one message

Suppose an application writes 1,000 bytes to a TCP socket. A successful `send()` usually means the local operating system accepted those bytes; it does **not** mean the remote application has read them. TCP assigns sequence numbers, sends segments as the receiver and path allow, and retains data as needed for retransmission. The receiver acknowledges bytes and eventually makes them available to its application.

Two separate limits control how much unacknowledged data can be in flight:

- **Receive window (`rwnd`)**: how much more data the receiver can accept.
- **Congestion window (`cwnd`)**: how much data the sender is allowed to place in the network based on congestion control.

The usable sending window is constrained by both. Flow control protects the receiver; congestion control protects the network. Most tuning should begin with evidence—throughput, RTT, retransmissions, queueing, and application latency—not with a copied sysctl recipe.

## Kernel socket memory: queues and sk_buff

In Linux, a TCP socket is not a passive pipe; it is backed by two kernel memory queues managed by `struct sock`:
1. **Send-side queues**: Track data awaiting transmission or acknowledgment, as well as protocol metadata needed to manage it.
2. **Receive-side queues**: Hold received data and protocol state until the application consumes the ordered byte stream.

Linux uses `sk_buff` structures to represent network packets and their metadata at different stages of the networking stack. They are not simply one record per application write: TCP can segment, combine, queue, and process data in ways that do not map one-to-one to calls such as `send()`.

```text
TCP data lifecycle (not a literal memory layout):
[ACKed: released] [In flight: retained for retransmission] [Queued: not yet sent]
                    ^ snd_una                    ^ snd_nxt
```

- **`snd_una` (Send Unacknowledged)**: Sequence number of the earliest byte sent for which no ACK has arrived.
- **`snd_nxt` (Send Next)**: Sequence number of the next byte to be transmitted onto the wire.
- **`snd_wnd` (Send Window)**: Maximum number of bytes the receiver has permitted us to send.

### Why data remains in the send buffer after send() returns
For a successful `write()` or `send()`, the returned byte count indicates how many bytes the local socket accepted. A blocking call can wait for local buffer space; a successful return does not mean the peer received or processed the bytes.

TCP retains transmitted data as needed for reliable delivery until it is acknowledged. If data is lost, the TCP stack can retransmit it without asking the application to write it again.

## Flow control vs congestion control: Sliding windows

Two distinct mechanisms govern how fast a TCP connection can transmit data:

### 1. Flow Control (Receiver Protection)
Flow control prevents a fast sender from overwhelming a slow receiver's memory buffer.
- The receiver advertises its available buffer space in every TCP header via the **Receive Window (`rwnd`)** field (16 bits).
- Using the **Window Scale Option (RFC 7323)** negotiated during the 3-way handshake, the 16-bit window is bit-shifted up to 14 bits, supporting receive windows up to 1 gigabyte.

```text
Flow Control Backpressure:
1. Sender streams at 100 MB/s.
2. Receiver app slow (DB locked); buffer fills.
3. Receiver sends ACK with rwnd = 0 (Zero Window).
4. Sender kernel stops transmitting immediately.
5. Sender probes periodically until window opens.
```

If the receiver application stops reading, its receive buffer can fill and the advertised window can shrink to zero. The sender then stops sending new data beyond what is already in flight and periodically probes for a window update. This is TCP flow control; it does not necessarily block the sending application's thread, which depends on socket mode and available local send-buffer space.

### 2. Congestion Control (Network Protection)
Congestion control prevents all combined senders from overwhelming intermediate routers and fiber links.
- The sender maintains an internal variable called the **Congestion Window (`cwnd`)**.
- The actual effective transmission window is the minimum of both constraints:

```text
Effective Transmission Window:
W_effective = min(rwnd, cwnd)
```

Modern congestion-control algorithms include **CUBIC** and **BBR**. They estimate and respond to path capacity differently, and the algorithm available or enabled depends on the operating system and deployment. Neither is universally best; compare them using representative traffic and network paths.

## Socket options: Nagle, Delayed ACK, and TIME_WAIT

Nagle's algorithm and delayed acknowledgments can interact with small request/response writes, but their effect depends on the application and TCP implementation.

### 1. Nagle's Algorithm and Delayed ACKs
Nagle's algorithm can hold a small write while earlier data remains unacknowledged, reducing tiny packets. Delayed ACK behavior can add latency in some request/response patterns, but the delay is implementation- and situation-dependent; a fixed 40 ms penalty is not guaranteed.

`TCP_NODELAY` disables Nagle's algorithm for a socket:
```c
int flag = 1;
setsockopt(fd, IPPROTO_TCP, TCP_NODELAY, &flag, sizeof(flag));
```
Use it only when measurements show that buffering small writes is hurting latency. It can increase packet count and does not force the network to deliver data immediately.

### 2. The TIME_WAIT state and ephemeral port exhaustion
After an orderly close, the endpoint performing the active close normally enters **`TIME_WAIT`** so delayed duplicate segments expire and the final acknowledgment can be retransmitted if needed. The timer is based on the protocol's Maximum Segment Lifetime; its duration and implementation details are platform-dependent, not a universal fixed 60 seconds.

```text
TIME_WAIT State Purpose:
1. Ensure late arriving duplicate packets dissipate in the network.
2. Ensure the remote peer receives the final ACK cleanly.
```

If an API gateway or microservice creates and closes many outbound connections instead of reusing them:
- Active-close connections may remain in `TIME_WAIT`. Depending on the local port range, destination tuples, connection rate, and reuse behavior, a client can encounter ephemeral-port pressure or `EADDRNOTAVAIL`.

**First response**: Reuse persistent HTTP/gRPC connections where appropriate and measure concurrent connections and port use. `SO_REUSEADDR` and `tcp_tw_reuse` have specific semantics and kernel-version-dependent behavior; they are not interchangeable fixes for port exhaustion and should not be enabled without understanding the workload and platform.

## Production Linux TCP kernel tuning

There is no safe, universal TCP tuning profile. Before changing host-wide settings:

1. Identify the symptom: connection setup delay, retransmissions, low throughput, memory pressure, or port exhaustion.
2. Measure the relevant queues, RTT, loss, socket counts, and application latency under representative load.
3. Check the exact kernel documentation for the setting and verify that the application actually uses it.
4. Change one setting at a time, compare against a baseline, and keep a rollback path.

Socket buffer autotuning, listen backlogs, ephemeral port ranges, and congestion-control algorithms are separate controls. Raising a limit does not fix a bottleneck by itself and may increase memory use or queueing delay.

### Summary
- The kernel send buffer holds unacknowledged bytes for potential retransmission; `send()` completes when bytes enter RAM, not when they arrive at the client.
- TCP limits unacknowledged data using both the receiver's advertised window (`rwnd`) and the sender's congestion window (`cwnd`); their minimum constrains the amount in flight, not by itself the application sending rate.
- Consider `TCP_NODELAY` only when measured latency and packet behavior justify it.
- Reuse connections to prevent ephemeral port depletion in `TIME_WAIT`.

## References

- [IETF RFC 9293: Transmission Control Protocol](https://www.rfc-editor.org/rfc/rfc9293)
- [Linux kernel documentation: IP sysctl settings](https://docs.kernel.org/networking/ip-sysctl.html)
