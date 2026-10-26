---
title: "mediasoup SFU Architecture: Routers, Transports, Producers, and Consumers"
description: "Learn mediasoup's server-side media model, how applications signal peers, and how publications become subscribed media streams."
slug: "mediasoup-sfu-architecture"
date: "2026-10-25"
tags:
  - WebRTC
  - mediasoup
  - SFU
  - Node.js
category: "Backend Engineering"
difficulty: "advanced"
published: true
featured: false
author: "Adarsh Kumar"
cover: null
---

Unlike turnkey conferencing solutions, **mediasoup** is not an off-the-shelf media server. It is a low-level, high-performance **SFU library** for Node.js and Rust. It provides developers with the low-level RTP routing primitives needed to build scalable real-time video, audio, and data streaming platforms, while leaving signaling protocols, room state, authentication, and product business logic entirely to the application.

Understanding mediasoup's architecture requires mastering its dual-process model (C++ worker core coupled with a Node.js control plane), its hierarchical object model, RTP capabilities negotiation, and the operational lifecycle of transports, producers, and consumers.

![mediasoup room media path from browser producer through router to subscribed consumer](/articles/images/mediasoup-room-flow.svg "mediasoup SFU producer-to-consumer flow")

Figure 1: Complete mediasoup media routing path. A publishing browser sends RTP media over a WebRtcTransport into a Producer. The Router inspects codecs and forwards compatible packets to Consumers created for subscribing peers. Application signaling orchestrates this setup over WebSockets, while raw media packets flow directly through mediasoup's multi-threaded C++ engine.

## The Dual-Process Architecture: C++ Core + Node.js Control

Node.js provides an exceptional asynchronous environment for managing WebSockets, HTTP REST APIs, database queries, and room state machines. However, handling real-time audio and video at scale requires parsing tens of thousands of UDP packets per second, executing DTLS encryption/decryption, processing RTCP feedback, and rewriting RTP headers with sub-millisecond precision—tasks that would completely freeze the single-threaded Node.js V8 event loop.

mediasoup solves this with a **dual-process architecture**:

```text
[ Node.js Master Process ]
    (Rooms, Signaling, WebSockets)
        │
        ├── Bidirectional UNIX Socket IPC
        │
        ├── [ mediasoup C++ Worker 0 ] (Core 0)
        ├── [ mediasoup C++ Worker 1 ] (Core 1)
        └── [ mediasoup C++ Worker 2 ] (Core 2)
```

1. **The Node.js Master Process**: Acts as the orchestrator. It manages the signaling plane, validates JWT tokens, handles room presence, and invokes API methods on JavaScript wrapper objects (`worker.createRouter()`, `router.createWebRtcTransport()`).
2. **The C++ Worker Processes**: Independent child processes compiled with C++17, `libuv` (event loop), `libwebrtc` (RTP/RTCP/SCTP stacks), and OpenSSL. Each worker process is pinned to a dedicated physical CPU core (`worker.createWorker({ cpuAffinity: [0] })`).
3. **High-Speed IPC Channel**: The Node.js process and C++ workers communicate over bidirectional UNIX domain sockets using a binary and JSON serialization protocol. Heavy media packet processing occurs 100% inside C++, keeping the Node.js event loop free to handle application signaling.

## The Mediasoup Object Hierarchy

mediasoup organizes media distribution through a strict hierarchical object tree:

```text
Worker (Process on 1 CPU Core)
  └── Router (Room Domain)
        ├── WebRtcTransport (Publisher A)
        │     ├── Producer (Audio Track)
        │     └── Producer (Video Track)
        │
        ├── WebRtcTransport (Subscriber B)
        │     ├── Consumer (A's Audio)
        │     └── Consumer (A's Video)
        │
        └── PipeTransport (Inter-Worker Bridge)
```

### 1. Worker
An OS child process. To fully utilize modern multi-core servers (e.g., a 16-core AMD EPYC), an application spawns 16 distinct mediasoup workers. Workers do not share memory.

### 2. Router
An independent RTP routing domain that corresponds to a **Room** or **Session**. A Router defines the allowed codec capabilities (`mediaCodecs`: Opus, VP8, VP9, H.264, AV1). Media cannot flow between different routers unless bridged by a `PipeTransport`.

### 3. Transports
Network endpoints that terminate media connections:
- **`WebRtcTransport`**: Terminates ICE, DTLS, and SRTP for browser clients and mobile apps.
- **`PlainTransport`**: Carries raw RTP/RTCP over UDP without DTLS. Used to ingest or egress media to external tools like FFmpeg, GStreamer, or automated recording pipelines.
- **`PipeTransport`**: High-performance transport designed to pipe media streams between different Routers on the same server or across remote servers over private VPC networks.

### 4. Producer
Represents an incoming media source injected into a Router by a peer (e.g., microphone audio, webcam video, or screen share).

### 5. Consumer
Represents an outgoing media destination forwarded by a Router to a subscribing peer. The Consumer handles SSRC translation, sequence number rewriting, and simulcast layer selection for that specific subscriber.

## RTP Capabilities negotiation protocol

Before media can be published or consumed, the client browser and the server Router must negotiate compatible RTP capabilities:

1. **Join Room**: Client joins room over signaling; server returns `router.rtpCapabilities`.
2. **Initialize Device**: Client computes intersecting capabilities:
   ```javascript
   await device.load({ routerRtpCapabilities });
   ```
3. **Verify Produce Capability**: Client checks local encoder:
   ```javascript
   device.canProduce('video');
   ```
4. **Verify Consume Capability**: Server checks receiver compatibility:
   ```javascript
   router.canConsume({
     producerId,
     rtpCapabilities: device.rtpCapabilities,
   });
   ```

- **`router.rtpCapabilities`**: Contains the codecs, clock rates, payload types, and header extensions supported by the server's router.
- **`device.load()`**: In the browser, `mediasoup-client` queries browser capabilities via `RTCRtpSender.getCapabilities()` and computes the intersection with the router's capabilities.
- **`router.canConsume()`**: Before creating a Consumer on the server, the application must verify that the subscriber's device can decode the specific codec and parameters used by the Producer.

## Lifecycle: Why Consumers must start `paused: true`

A common beginner mistake in mediasoup is creating a Consumer on the server in an active state:

```javascript
// Server-side consumer creation
const consumer = await transport.consume({
  producerId: producer.id,
  rtpCapabilities: clientRtpCapabilities,
  paused: true, // MANDATORY IN PRODUCTION!
});
```

### Why `paused: true` is essential:
1. When a Consumer is created on the server, RTP packets are immediately available from the Producer.
2. However, the client browser has not yet received the Consumer parameters over signaling, has not yet called `transport.consume()` locally, and the client's WebRTC peer connection has not finalized remote description processing.
3. If the server emits RTP packets immediately, the first packets—**including the crucial initial keyframe (IDR frame)**—reach the browser before its decoder is wired, resulting in dropped packets.
4. The client's video element remains black until the next periodic keyframe arrives (which could take 5 to 10 seconds).
5. **The Correct Pattern**:
   - Create Consumer with `paused: true`.
   - Send consumer parameters (`id`, `producerId`, `kind`, `rtpParameters`) to the client over WebSocket signaling.
   - Client creates the local consumer track and connects the transport.
   - Client sends signaling request `resumeConsumer(consumerId)`.
   - Server calls `await consumer.resume()`. The C++ core sends an immediate RTCP **Picture Loss Indication (PLI)** to the Producer, generating a fresh keyframe right as the client decoder becomes active.

## SSRC and Sequence Number rewriting in C++

When an SFU forwards video, it cannot simply copy raw RTP packets directly from a Producer to a Consumer.

```text
Producer (Simulcast Layers)
  ├── High   (SSRC 1001, Seq: 45, 46, 47...)
  ├── Medium (SSRC 1002, Seq: 110, 111, 112...)
  └── Low    (SSRC 1003, Seq: 890, 891, 892...)
        │
        ▼  [ C++ Routing Core ]
        │  (Rewrites SSRC & Sequence Numbers)
        ▼
Consumer (Subscriber)
  └── Stable Stream (SSRC 5555, Seq: 1, 2, 3...)
```

If the subscriber switches from Medium to High resolution:
- The subscriber's browser decoder expects a **single, contiguous stream of sequence numbers and timestamps** with a constant SSRC.
- If sequence numbers jumped from `112` to `48`, the browser's jitter buffer would assume thousands of packets were dropped, resulting in severe video stutter.
- mediasoup's C++ worker intercepts every forwarded packet, dynamically rewriting the SSRC to a stable consumer SSRC and offsetting sequence numbers and timestamps so layer switches appear completely seamless to the decoder.

## Scaling multi-core servers and clusters

A single mediasoup router is bound to a single worker process running on one CPU core. To scale across full hardware:

### 1. Scaling across multiple CPU cores on a single host
- Distribute rooms across workers in a round-robin or least-loaded fashion.
- If a single room has hundreds of viewers, a single CPU core may saturate. Use `router.pipeToRouter()`:
  - Producer publishes to Router A on Worker 0.
  - Router A pipes the producer to Router B on Worker 1 via an internal `PipeTransport`.
  - Consumers on Worker 1 subscribe to the piped producer, distributing downstream subscriber packet fan-out across multiple CPU cores.

```javascript
// Pipe a producer from Router A to Router B
const { pipeConsumer, pipeProducer } =
  await routerA.pipeToRouter({
    producerId: producer.id,
    router: routerB,
  });
```

### 2. Multi-server edge-origin clustering
For large-scale webinars or interactive broadcasting:
- **Origin Server**: Receives media publications from the host over WebRtcTransports.
- **Edge Servers**: Located close to global users (US-East, EU-West, AP-East).
- The Origin server forwards media to Edge servers over encrypted `PipeTransports` across private VPC peering links.
- Thousands of viewers connect to regional Edge servers, keeping latency low and isolating viewer fan-out from the broadcaster.

## Production Linux kernel tuning

Because mediasoup relies on high-throughput UDP packet switching, default Linux OS network buffers will cause massive kernel packet drops under heavy load.

Apply these production sysctl settings (`/etc/sysctl.conf`):

```bash
# Increase max socket receive and send buffer (16MB)
sysctl -w net.core.rmem_max=16777216
sysctl -w net.core.wmem_max=16777216

# Increase network device backlog queue
sysctl -w net.core.netdev_max_backlog=10000

# Increase file descriptors for UDP sockets
ulimit -n 65536
```

Configure mediasoup worker port ranges deliberately:
- Dedicate non-overlapping UDP port ranges per worker (e.g., Worker 0 uses ports `40000-40999`, Worker 1 uses `41000-41999`) to prevent OS socket binding contention.

### Key takeaways

- mediasoup is a modular SFU library that separates high-speed C++ media processing from the Node.js application signaling plane.
- Spawn one mediasoup worker per CPU core and distribute rooms across workers.
- Always create Consumers with `paused: true` and resume only after the client's decoder is connected to prevent dropped keyframes.
- mediasoup's C++ core transparently handles SSRC and sequence number rewriting during simulcast and SVC layer switching.
- Scale high-capacity rooms across CPU cores and multi-server clusters using `PipeTransports`.

## References

- [mediasoup Documentation: Architecture Overview](https://mediasoup.org/documentation/v3/mediasoup/design/)
- [mediasoup Documentation: Scalability and Multi-Core Routing](https://mediasoup.org/documentation/v3/scalability/)
- [mediasoup Documentation: Consumer Lifecycle and Pausing](https://mediasoup.org/documentation/v3/mediasoup/api/#consumer-resume)
- [W3C Recommendation: WebRTC 1.0 Real-Time Communication](https://www.w3.org/TR/webrtc/)
- [IETF RFC 7667: RTP Topologies](https://www.rfc-editor.org/rfc/rfc7667)
