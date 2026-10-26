---
title: "SFU vs. MCU: Choosing a Group Video Architecture"
description: "Compare peer mesh, selective forwarding, and server-side media composition across bandwidth, latency, compute cost, and product requirements."
slug: "sfu-vs-mcu-group-video-architecture"
date: "2026-10-25"
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

In a one-on-one video call, direct peer-to-peer (P2P) WebRTC provides minimal latency, zero media server infrastructure costs, and end-to-end encryption. However, the moment a third, fifth, or twentieth participant joins the call, real-time media dynamics experience a combinatorial explosion.

Building a multi-party conferencing platform (such as Zoom, Google Meet, or Microsoft Teams) requires selecting the appropriate media distribution topology: **P2P Mesh, Multipoint Conferencing Unit (MCU), or Selective Forwarding Unit (SFU)**.

Each topology makes fundamentally different trade-offs across client uplink/downlink bandwidth, client CPU, server infrastructure costs, transcode latency, and client-side UI layout flexibility.

![Comparison of mesh, SFU forwarding, and MCU composition for group calls](/articles/images/sfu-vs-mcu-topologies.svg "Group call media topology comparison")

Figure 1: Comparison of multi-party media distribution topologies. Mesh establishes full peer-to-peer links, placing quadratic bandwidth and encoding strain on endpoints. An SFU acts as a lightweight RTP packet router, forwarding selected streams without transcoding. An MCU decodes all incoming streams and re-encodes a single composed composite video for each recipient.

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
| **Total Media Links** | N(N - 1) / 2 = O(N^2) (quadratic growth) | 2N = O(N) (1 publish + 1 subscribe per peer) | 2N = O(N) (1 publish + 1 subscribe per peer) |
| **Client CPU Overhead** | Extreme: Encodes and decodes N-1 streams | Moderate: Encodes 1 stream; decodes K streams | Minimal: Encodes 1 stream; decodes 1 stream |
| **Server Media Processing CPU** | Zero (no media servers required) | Extremely Low (O(1) packet routing; no transcode) | Extreme (O(N) decoders + compositor + N encoders) |
| **Server Egress Bandwidth** | Zero | O(N * K) (forwards selected streams) | O(N) (sends single stream per client) |
| **Added Latency** | 0 ms (direct peer-to-peer) | 1–5 ms (in-memory packet buffer and rewrite) | 150–350 ms (decode, composite, re-encode) |
| **End-to-End Encryption (E2EE)** | Native (direct peer-to-peer DTLS-SRTP) | Supported via SFrame (RFC 9605 / Insertable Streams)| Impossible (server must decrypt to composite) |
| **Maximum Room Capacity** | 4 to 6 participants max | Hundreds to thousands of participants | Tens of participants (bound by server GPU/CPU) |

## Mesh: Why P2P collapses beyond small groups

In a full P2P mesh, for a room of N = 8 participants:
- Each client must maintain 7 independent bidirectional WebRTC peer connections.
- If each participant sends a standard 720p stream at 1.5 Mbps, each client requires an **uplink bandwidth of 10.5 Mbps** (7 * 1.5 Mbps).
- Most consumer broadband and mobile connections have asymmetric uplink speeds capped at 5–10 Mbps.
- Mobile devices cannot decode 7 concurrent H.264/VP8 video streams without thermal throttling, frame drops, and battery drain.

**Conclusion**: Mesh is only viable for 1-on-1 calls or small ad-hoc groups capped strictly at 3 to 4 participants.

## MCU: The legacy hardware approach

The **Multipoint Conferencing Unit (MCU)** was the dominant architecture in legacy enterprise telepresence systems (e.g., Polycom, Cisco Tandberg).
- **How it works**: The server decodes every participant's incoming compressed video frames into raw YUV pixel bitmaps in RAM. It scales and renders these bitmaps onto a single composite video canvas (e.g., a 2x2 or 3x3 grid), mixes the audio channels into a single waveform, and re-encodes a brand-new video stream for the recipient.

### Critical operational liabilities of an MCU
1. **Astronomical compute costs**: Video decoding and hardware-accelerated H.264/AV1 encoding are compute-intensive. A single high-end cloud server (e.g., AWS c6i.16xlarge) can host hundreds of SFU rooms, but only 2 or 3 MCU composite rooms before saturating 64 CPU cores.
2. **Fixed transcode latency penalty**: Decoding frames, aligning frame rates, compositing canvases, and re-encoding adds **150–350 ms of processing latency**, ruining conversational fluidity.
3. **Loss of client UI layout control**: Because the server bakes the grid layout into a single video frame, the client app cannot click-to-zoom a specific participant, change aspect ratios, render custom CSS overlays, or dynamically pin tiles.
4. **Where MCUs are still used today**: SIP/PSTN legacy phone dial-in gateways, live RTMP streaming to YouTube/Twitch (where viewer latency is 5 seconds anyway), and automated server-side session recording pipelines.

## SFU: The modern standard for real-time video

The **Selective Forwarding Unit (SFU)** is the architecture powering modern platforms (Zoom, Google Meet, Discord, mediasoup, LiveKit).

An SFU does **not** decode, composite, or re-encode video frames. Instead, it operates as a specialized, ultra-low-latency **RTP packet router**:
1. Client publishes its audio and video streams to the SFU server over a single WebRTC transport.
2. The SFU inspects incoming RTP packet headers:
   - Synchronizes Synchronization Source (SSRC) identifiers.
   - Rewrites RTP sequence numbers and timestamps to maintain a continuous, gap-free stream for downstream decoders.
3. The SFU selectively routes specific packets to subscribed clients based on layout state and active speaker detection.

Because the SFU only modifies packet headers in memory without touching compressed frame payloads, it adds negligible latency (< 5 ms) and can handle thousands of concurrent video tracks on a single server.

## Dynamic adaptation: Simulcast and SVC

In a group call, participants have vastly different network conditions. Peer A is on gigabit fiber; Peer B is on a degraded 4G mobile link with 20% packet loss.

If the SFU forwarded Peer A's full 1080p stream to Peer B, Peer B's downlink would instantly collapse into severe packet loss and frozen video.

To solve this, modern SFUs implement **Simulcast** or **Scalable Video Coding (SVC)**.

```text
[ Client Camera ]
       │
       ├── Layer 2: 720p ──> SFU ──> Stage Tile
       ├── Layer 1: 360p ──> SFU ──> Medium Grid
       └── Layer 0: 180p ──> SFU ──> Thumbnails
```

### 1. WebRTC Simulcast (VP8 / H.264)
The publishing client's hardware encoder produces three distinct, parallel RTP streams at different resolutions and bitrates from the same camera source.
- The SFU dynamically routes the **High-layer** stream to the client displaying that speaker in a large stage tile.
- The SFU routes the **Low-layer** stream to clients displaying that participant as a tiny thumbnail in a 16-person grid.
- If a client experiences network congestion, the SFU automatically steps down its subscription from High to Medium or Low without interrupting playback.

### 2. Scalable Video Coding (SVC - VP9 / AV1)
Instead of encoding three separate streams (which uses 30% more upload bandwidth), SVC encodes a **single structured bitstream** containing hierarchical dependency layers:
- **Temporal scalability (T0, T1, T2)**: Allows the SFU to drop frames to reduce frame rate from 60fps to 30fps or 15fps without corrupting the video stream.
- **Spatial scalability (S0, S1, S2)**: Allows the SFU to drop resolution enhancement layers.

## Active Speaker Detection (ASD) mechanics

In a room with 50 participants, clients do not want to receive 50 separate audio streams.

The SFU manages audio routing using the **Audio Level RTP Header Extension (RFC 6464)**:
1. The client's audio capture library calculates audio volume (energy) in decibels relative to full scale (dBov) for each audio packet and injects this 7-bit scalar into the RTP header.
2. The SFU reads the dBov scalar in the header without decoding Opus audio packets.
3. The SFU maintains an **audio energy ranking table** with exponential decay filtering (hysteresis) to prevent rapid speaker oscillation.
4. The SFU forwards only the top 3 loudest active speakers' audio streams to participants, saving substantial client audio decoding CPU.

## Congestion control and keyframe injection

When the SFU switches a subscriber from receiving a Low simulcast layer to a High simulcast layer, the subscriber's video decoder cannot decode intermediate delta frames (P-frames) without a reference keyframe (I-frame).

- The SFU sends an RTCP **Picture Loss Indication (PLI - RFC 4585)** or **Full Intra Request (FIR - RFC 5104)** upstream to the publishing client.
- The publishing client generates a fresh keyframe on the High layer immediately.
- The SFU intercepts the keyframe and begins forwarding the High stream to the subscriber, enabling seamless, artifact-free layer switching in under 200ms.

### Key takeaways

- P2P Mesh scales quadratically (O(N^2)), collapsing client uplink bandwidth and CPU beyond 4 participants.
- MCUs simplify client downlink bandwidth by compositing video on the server, but impose massive compute costs, high latency (+200 ms), and inflexible UI layouts.
- SFUs are the modern gold standard: they forward selected RTP packets in memory without transcoding, scaling to hundreds of participants with sub-5ms processing latency.
- Simulcast and SVC allow SFUs to serve different resolutions to different participants based on screen layout and network capacity.
- Use RFC 6464 audio level headers for Active Speaker Detection and RTCP PLI/FIR feedback for seamless simulcast layer switching.

## References

- [W3C Recommendation: WebRTC 1.0 (Section 5: MediaStreamTrack and RTCRtpSender)](https://www.w3.org/TR/webrtc/)
- [IETF RFC 7667: RTP Topologies (Section 3.7: Selective Forwarding Middlebox)](https://www.rfc-editor.org/rfc/rfc7667)
- [IETF RFC 6464: A Real-time Transport Protocol (RTP) Header Extension for Client-to-Server Sound Level Indication](https://www.rfc-editor.org/rfc/rfc6464)
- [IETF RFC 8834: Media Transport and Use of RTP in WebRTC](https://www.rfc-editor.org/rfc/rfc8834)
- [IETF RFC 9605: Secure Frame (SFrame) Architecture](https://www.rfc-editor.org/rfc/rfc9605)
