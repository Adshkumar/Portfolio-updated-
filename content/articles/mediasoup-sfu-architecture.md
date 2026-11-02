---
title: "mediasoup SFU Architecture: Routers, Transports, Producers, and Consumers"
description: "Learn mediasoup's server-side media model, how applications signal peers, and how publications become subscribed media streams."
slug: "mediasoup-sfu-architecture"
date: "2026-10-25"
updated: "2026-11-02"
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

Unlike turnkey conferencing solutions, **mediasoup** is not an off-the-shelf media server. It is a low-level **SFU library** with Node.js and Rust APIs. This article focuses on the Node.js API, which uses a native worker subprocess for media processing. The library provides RTP routing primitives; the application remains responsible for signaling, room state, authentication, and product logic.

The key concepts are the Node.js control plane, native worker, object hierarchy, RTP capability negotiation, and lifecycle of transports, producers, and consumers.

![mediasoup room media path from browser producer through router to subscribed consumer](/articles/images/mediasoup-room-flow.svg "mediasoup SFU producer-to-consumer flow")

Figure 1: A publishing peer sends media through a WebRtcTransport to a Producer in a Router. The application uses signaling to create compatible Consumers for subscribers. The Node.js application controls the workflow; a mediasoup worker subprocess handles media transport and forwarding.

## The moving parts at a glance

Think of a mediasoup **Router** as the media-routing space for a room. A participant sends audio or video through a **Transport**; the server represents that published track as a **Producer**. Another participant's application asks to receive it, and mediasoup creates a **Consumer** if the receiver's capabilities are compatible.

The application still owns the product workflow: authentication, room membership, signaling messages, and deciding who may subscribe to whom. mediasoup handles the media-routing primitives. This division is useful when you need control over call behavior, but it means your application must implement and operate the surrounding system.

## The Dual-Process Architecture: C++ Core + Node.js Control

Node.js provides an asynchronous environment for managing signaling, APIs, and room state. mediasoup keeps media handling in worker subprocesses so packet processing does not run as application JavaScript on the Node.js event loop.

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

1. **The application process**: Uses the mediasoup JavaScript API to create workers, routers, transports, producers, and consumers. Authentication, room state, and signaling are the application's responsibility.
2. **The worker processes**: Each Worker is a native subprocess that handles media operations. A Router belongs to a Worker; adding more Workers can use more host CPU capacity, but a single Router's work is not automatically distributed across all Workers. The operating system schedules workers, so CPU affinity and worker counts should be configured and measured for the deployment.
3. **Inter-process communication**: The JavaScript layer communicates with workers over IPC. The application orchestrates media through the API while the worker handles the media plane.

## The Mediasoup Object Hierarchy

mediasoup organizes media distribution through a strict hierarchical object tree:

```text
Worker (native subprocess)
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
A native child process that owns Routers and handles media operations. Applications commonly create multiple workers to use available host CPU capacity, but the useful count depends on workload, CPU limits, and other processes; workers do not share their in-process Router state.

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
Represents an outgoing media destination forwarded by a Router to a subscribing peer. mediasoup maps RTP parameters for the consumer and can select among supported encodings or layers; exact SSRC and sequence-number behavior depends on the producer, codec, and negotiated RTP parameters.

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

## Lifecycle: Why Consumers often start `paused: true`

A common integration pitfall is allowing a Consumer to send media before the client has received its parameters and prepared its local receiver. A common pattern is to create the Consumer paused:

```javascript
// Server-side consumer creation
const consumer = await transport.consume({
  producerId: producer.id,
  rtpCapabilities: clientRtpCapabilities,
  paused: true,
});
```

### Why starting paused can help
The server can create the Consumer before the client has received its parameters and created the corresponding local Consumer. Pausing avoids forwarding media during that signaling gap; otherwise the client may miss initial packets and need to wait for a decodable video frame.

A common sequence is:
1. Create the Consumer with `paused: true`.
2. Send its parameters (`id`, `producerId`, `kind`, `rtpParameters`) to the client through the application's signaling channel.
3. Have the client create its local Consumer and complete the required transport setup.
4. Have the client signal readiness, then resume the server Consumer.
5. Depending on codec and implementation state, a keyframe request may be needed before video can be decoded promptly; do not assume every resume produces an immediate keyframe.

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

When a subscriber switches simulcast layers, the outgoing RTP stream must remain usable by the receiver. An SFU may translate SSRCs, sequence numbers, or timestamps according to its RTP mapping and the negotiated codec. A layer switch can still require a keyframe or cause a visible interruption; seamless switching is not guaranteed by rewriting identifiers alone.

## Scaling multi-core servers and clusters

A Router belongs to one Worker, so its work does not automatically span multiple workers. To scale across host capacity:

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
- The Origin server forwards media to Edge servers over `PipeTransport` connections across private network links. Configure SRTP or another appropriate protection when media crosses an untrusted network; a private route alone is not encryption.
- Thousands of viewers connect to regional Edge servers, keeping latency low and isolating viewer fan-out from the broadcaster.

## Production Linux kernel tuning

UDP buffer and file-descriptor settings depend on packet rate, operating system, NIC, and deployment. Establish a baseline with packet-drop, CPU, and socket-queue metrics before changing host limits; larger queues can also increase latency under overload.

Configure mediasoup worker port ranges deliberately:
- Dedicate non-overlapping UDP port ranges per worker (e.g., Worker 0 uses ports `40000-40999`, Worker 1 uses `41000-41999`) to prevent OS socket binding contention.

### Key takeaways

- The Node.js mediasoup API separates application control and signaling from native worker media processing.
- Use multiple workers when measurements show that the host has available CPU capacity, and distribute Routers/rooms according to load and failure-isolation needs.
- Consider creating Consumers paused, then resume after the client has received the parameters and is ready to receive media.
- mediasoup manages RTP forwarding and mapping, but layer changes can require keyframes and are not guaranteed to be visually seamless.
- Scale high-capacity rooms across CPU cores and multi-server clusters using `PipeTransports`.

## References

- [mediasoup Documentation: Architecture Overview](https://mediasoup.org/documentation/v3/mediasoup/design/)
- [mediasoup Documentation: Scalability and Multi-Core Routing](https://mediasoup.org/documentation/v3/scalability/)
- [mediasoup Documentation: Consumer Lifecycle and Pausing](https://mediasoup.org/documentation/v3/mediasoup/api/#consumer-resume)
- [W3C Recommendation: WebRTC 1.0 Real-Time Communication](https://www.w3.org/TR/webrtc/)
- [IETF RFC 7667: RTP Topologies](https://www.rfc-editor.org/rfc/rfc7667)
