---
title: "SFU vs. MCU: Choosing a Group Video Architecture"
description: "Compare peer mesh, selective forwarding, and server-side media composition across bandwidth, latency, compute cost, and product requirements."
slug: "sfu-vs-mcu-group-video-architecture"
date: "2026-10-25"
updated: "2026-11-02"
tags:
  - WebRTC
  - SFU
  - MCU
  - System Design
category: "System Design"
difficulty: "advanced"
published: true
featured: false
author: "Adarsh Kumar"
cover: null
---

In a one-on-one call, a direct peer-to-peer WebRTC path can avoid a media-server hop. In a group call, sending a separate copy of every participant's media to every other participant can quickly strain client uplink, CPU, and battery.

Building a multi-party conferencing platform (such as Zoom, Google Meet, or Microsoft Teams) requires selecting the appropriate media distribution topology: **P2P Mesh, Multipoint Conferencing Unit (MCU), or Selective Forwarding Unit (SFU)**.

Each topology makes fundamentally different trade-offs across client uplink/downlink bandwidth, client CPU, server infrastructure costs, transcode latency, and client-side UI layout flexibility.

![Comparison of mesh, SFU forwarding, and MCU composition for group calls](/articles/images/sfu-vs-mcu-topologies.svg "Group call media topology comparison")

Figure 1: Comparison of multi-party media distribution topologies. Mesh establishes full peer-to-peer links, placing quadratic bandwidth and encoding strain on endpoints. An SFU acts as a lightweight RTP packet router, forwarding selected streams without transcoding. An MCU decodes all incoming streams and re-encodes a single composed composite video for each recipient.

## The choice in plain language

In a small peer-to-peer mesh, every participant sends media directly to every other participant. An SFU moves that forwarding work to a server: each person publishes media once, and the server forwards selected streams to subscribers. An MCU goes further and combines media into a new output stream, which can simplify a viewer's playback but costs more server processing and reduces layout flexibility.

Choose an SFU when clients need to select or arrange participant streams and the server should avoid decoding every video. Choose an MCU when a server-composed layout or a single output stream is a product requirement. A mesh can be appropriate for very small calls. Actual capacity and latency depend on codecs, resolutions, subscriptions, hardware, and network conditions.

## Mathematical comparison of group topologies

To evaluate these architectures, analyze how network bandwidth, CPU consumption, and connection counts scale as the number of participants `N` increases.

```text
1. P2P Mesh:
   Every client links to every peer.
2. SFU (Routing):
   Publish 1 stream; SFU forwards K streams.
3. MCU (Mixing):
   Publish 1 stream; MCU decodes and mixes 1.
```

| Dimension | 1. P2P Mesh | 2. Selective Forwarding Unit (SFU) | 3. Multipoint Conferencing Unit (MCU) |
| --- | --- | --- | --- |
| **Client Uplink Bandwidth** | O(N - 1) (sends copy to every peer) | O(1) (sends 1 stream, or 3 simulcast layers) | O(1) (sends 1 stream) |
| **Client Downlink Bandwidth** | O(N - 1) (receives stream from every peer) | O(K) (K visible active speakers on screen) | O(1) (receives 1 composited stream) |
| **Connections vs. media streams** | N(N - 1) / 2 peer connections; each participant sends to N - 1 peers | Roughly one client-server transport per participant; consumer streams depend on subscription policy and can grow toward N(N - 1) | Roughly one client-server transport per participant; one composed output per participant |
| **Client CPU Overhead** | Extreme: Encodes and decodes N-1 streams | Moderate: Encodes 1 stream; decodes K streams | Minimal: Encodes 1 stream; decodes 1 stream |
| **Server Media Processing CPU** | No media server | No decoding or transcoding, but packet forwarding work grows with published and subscribed streams | Decoding, composition, and encoding work grows with participants, streams, and output profiles |
| **Server Egress Bandwidth** | Zero | O(N * K) (forwards selected streams) | O(N) (sends single stream per client) |
| **Added Latency** | No media server hop, but network path and device processing still add latency | Adds a server hop; processing delay depends on load and implementation | Adds decode, composition, and encode work; delay depends on implementation |
| **End-to-End Encryption (E2EE)** | Possible for direct media; deployment details matter | Application-layer media encryption such as SFrame can keep content opaque to the SFU | Content-aware composition requires the server to access the media |
| **Room capacity** | Best suited to small groups; test client and network limits | Can support larger rooms, but server and subscriber limits must be measured | Depends on server media-processing capacity and desired output quality |

## Mesh: Why P2P collapses beyond small groups

In a full P2P mesh, for a room of N = 8 participants:
- Each client must maintain 7 independent bidirectional WebRTC peer connections.
- If each participant sends a standard 720p stream at 1.5 Mbps, each client requires an **uplink bandwidth of 10.5 Mbps** (7 * 1.5 Mbps).
- Most consumer broadband and mobile connections have asymmetric uplink speeds capped at 5–10 Mbps.
- Mobile devices cannot decode 7 concurrent H.264/VP8 video streams without thermal throttling, frame drops, and battery drain.

**Conclusion**: Mesh is usually simplest for one-to-one and small calls. The practical group size depends on media quality, device capability, and uplink capacity, so measure it on the target clients rather than relying on a universal cutoff.

## MCU: The legacy hardware approach

The **Multipoint Conferencing Unit (MCU)** was the dominant architecture in legacy enterprise telepresence systems (e.g., Polycom, Cisco Tandberg).
- **How it works**: The server decodes every participant's incoming compressed video frames into raw YUV pixel bitmaps in RAM. It scales and renders these bitmaps onto a single composite video canvas (e.g., a 2x2 or 3x3 grid), mixes the audio channels into a single waveform, and re-encodes a brand-new video stream for the recipient.

### Critical operational liabilities of an MCU
1. **Higher compute cost**: Decoding and encoding video require substantially more work than forwarding compressed RTP packets. Capacity depends on codecs, resolutions, hardware acceleration, and the number of output layouts.
2. **Additional processing delay**: Decoding, compositing, and re-encoding add work and can increase latency; the amount depends on the implementation and load.
3. **Loss of client UI layout control**: Because the server bakes the grid layout into a single video frame, the client app cannot click-to-zoom a specific participant, change aspect ratios, render custom CSS overlays, or dynamically pin tiles.
4. **Where composition is useful**: A service may need a composed recording, a single program feed, compatibility with a downstream system, or server-controlled layouts. Those are product and integration requirements, not evidence that MCU is obsolete; streaming latency depends on the full delivery pipeline.

## SFU: The modern standard for real-time video

The **Selective Forwarding Unit (SFU)** is a common architecture for interactive multi-party media. Products can combine forwarding, transcoding, composition, and other techniques; the labels describe media-processing behavior, not a single implementation.

In a basic forwarding SFU, media payloads are forwarded without decoding and re-encoding every video stream. The server may inspect RTP metadata, select packets or layers, and adapt transport identifiers for each subscriber. The precise rewriting and forwarding behavior depends on the SFU and codec.

A forwarding SFU avoids the per-stream decode/composite/encode pipeline of an MCU, but still consumes CPU and network capacity for packet processing, encryption, congestion control, and fan-out. Added latency and room capacity depend on implementation, codecs, hardware, subscription patterns, and network load; measure them rather than assuming a fixed ceiling.

## Dynamic adaptation: Simulcast and SVC

In a group call, participants have vastly different network conditions. Peer A is on gigabit fiber; Peer B is on a degraded 4G mobile link with 20% packet loss.

If an SFU forwarded a high-bitrate stream to a subscriber whose link could not sustain it, the subscriber could experience congestion, loss, or poor playback.

To solve this, modern SFUs implement **Simulcast** or **Scalable Video Coding (SVC)**.

```text
[ Client Camera ]
       │
       ├── Layer 2: 720p ──> SFU ──> Stage Tile
       ├── Layer 1: 360p ──> SFU ──> Medium Grid
       └── Layer 0: 180p ──> SFU ──> Thumbnails
```

### 1. WebRTC Simulcast (VP8 / H.264)
The publishing client encodes multiple representations at different resolutions or bitrates from the same source. The added CPU and uplink cost depends on the codec, device, and configured layers.
- The SFU dynamically routes the **High-layer** stream to the client displaying that speaker in a large stage tile.
- The SFU routes the **Low-layer** stream to clients displaying that participant as a tiny thumbnail in a 16-person grid.
- The SFU or application can change a subscriber's selected layer based on network estimates, layout, and policy. A layer switch may require a keyframe and can briefly affect playback.

### 2. Scalable Video Coding (SVC - VP9 / AV1)
Instead of sending separate simulcast encodings, a supported SVC codec can encode a bitstream with dependency layers that a compatible SFU may selectively forward:
- **Temporal scalability (T0, T1, T2)**: Allows the SFU to drop frames to reduce frame rate from 60fps to 30fps or 15fps without corrupting the video stream.
- **Spatial scalability (S0, S1, S2)**: Allows the SFU to drop resolution enhancement layers.

## Active Speaker Detection (ASD) mechanics

In a large room, a client or service may choose to receive only selected audio streams rather than every participant's audio.

An implementation can use the **Audio Level RTP Header Extension (RFC 6464)** when negotiated and available. A client may include an audio-level indication; a server can use it with timing, policy, and other signals to identify likely active speakers. The extension does not define a universal ranking algorithm or require forwarding a fixed number of speakers.

## Congestion control and keyframe injection

When the SFU switches a subscriber from receiving a Low simulcast layer to a High simulcast layer, the subscriber's video decoder cannot decode intermediate delta frames (P-frames) without a reference keyframe (I-frame).

- When a subscriber needs a decodable frame after a layer change, an SFU may request a keyframe using RTCP feedback such as PLI or FIR, subject to codec and implementation behavior.
- The publisher may generate a keyframe; the SFU can then forward the appropriate layer. Timing and visual continuity depend on the publisher, codec, congestion, and SFU policy.

### Key takeaways

- A full mesh requires each participant to send media to multiple peers; endpoint uplink and processing grow with room size. There is no universal participant cutoff.
- An MCU can simplify client downlink by composing media on the server, at the cost of server-side media processing and less client control over the composed layout.
- A basic SFU forwards selected RTP media without decoding every stream. It can support larger rooms, but throughput and latency depend on subscriptions, media settings, and server capacity.
- Simulcast and SVC allow SFUs to serve different resolutions to different participants based on screen layout and network capacity.
- Audio-level indications and RTCP keyframe feedback are useful building blocks, not guarantees of a particular speaker-selection or layer-switching result.

## References

- [W3C Recommendation: WebRTC 1.0 (Section 5: MediaStreamTrack and RTCRtpSender)](https://www.w3.org/TR/webrtc/)
- [IETF RFC 7667: RTP Topologies (Section 3.7: Selective Forwarding Middlebox)](https://www.rfc-editor.org/rfc/rfc7667)
- [IETF RFC 6464: A Real-time Transport Protocol (RTP) Header Extension for Client-to-Server Sound Level Indication](https://www.rfc-editor.org/rfc/rfc6464)
- [IETF RFC 8834: Media Transport and Use of RTP in WebRTC](https://www.rfc-editor.org/rfc/rfc8834)
- [IETF RFC 9605: Secure Frame (SFrame) Architecture](https://www.rfc-editor.org/rfc/rfc9605)
