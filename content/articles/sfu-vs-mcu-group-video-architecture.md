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

A group video system has to move each participant's media to the people who need to see or hear it. The key architectural choice is whether endpoints send media to one another, a server forwards selected streams, or a server decodes and composes streams into a new output.

An **SFU** is a Selective Forwarding Unit. It receives encoded media streams and forwards selected streams to participants without normally decoding and re-encoding every frame. An **MCU** is a Multipoint Conferencing Unit. It decodes media, can mix audio or compose video layouts, and sends a composed output to recipients.

![Comparison of mesh, SFU forwarding, and MCU composition for group calls](/articles/images/sfu-vs-mcu-topologies.svg "Group call media topology comparison")

Figure 1: Mesh sends a separate peer connection to each other participant. An SFU receives participant streams and forwards selected streams. An MCU decodes and composes media into a new stream. These are architectural patterns; real products can combine approaches.

## Mesh: simple topology, growing endpoint cost

In a full mesh, each participant sends media directly to each other participant. For a room with `n` participants, each endpoint may need to send up to `n - 1` copies of its outgoing media. This can make upload bandwidth, encoding work, and connection management grow quickly as the room grows.

Mesh can be useful for small rooms where direct peer communication and minimal server media infrastructure are valuable. It still needs signaling, connectivity support, and careful handling of devices and network changes.

## SFU: forward streams, let clients choose

Each participant publishes media to an SFU. The SFU forwards selected streams to each recipient based on subscription, active-speaker state, layout, and available network capacity. Because it generally forwards encoded packets rather than composing every video, it can avoid much of the per-stream decode/encode work an MCU performs.

An SFU does not make media delivery free. The server handles many incoming and outgoing packets, and its egress bandwidth can be substantial. Participants still receive and decode the streams selected for them. If a client subscribes to too many high-resolution streams, its downlink and decoding capacity can be overwhelmed.

Scalable Video Coding or simulcast can give the server multiple qualities of a source. The SFU may forward a more suitable layer to a recipient, but the exact behavior depends on negotiated codecs, client support, and server implementation.

## MCU: compose for a simpler receiving experience

An MCU can produce one mixed audio stream or a composed video layout, such as a grid of participants. This can reduce the number of streams a constrained endpoint needs to decode and can support workflows that expect a single composed output.

The server must decode and process incoming media, then encode output streams. That consumes compute and can add processing latency. A composed output may also remove the recipient's ability to independently choose each source's quality or layout. Recording, transcription, and compliance requirements may influence the decision, but do not automatically require an MCU; these can be implemented as separate media consumers.

## Compare the whole system

| Consideration | Mesh | SFU | MCU |
| --- | --- | --- | --- |
| Endpoint upload | Can grow with peer count | Typically one publication per media source | Typically one publication per media source |
| Server media work | Low | Packet routing and selection | Decode, mix/compose, and encode |
| Recipient control | Each peer receives peer streams | Client can subscribe to selected streams | Usually receives composed output |
| Main scaling pressure | Endpoint connections and upload | Server packet rate and egress | Server media-processing compute |
| Useful when | Small rooms and direct paths fit | Interactive groups need per-source selection | Clients need a single composed feed |

These are tendencies, not universal capacity guarantees. Codec profiles, resolution, frame rate, audio channels, packetization, network conditions, and implementation choices change costs significantly.

## Hybrid designs and operational choices

Some products use an SFU for live interaction and a separate recording or compositing pipeline. Others use different topologies for small and large rooms. A hybrid adds more routing and observability work, so define when a room changes topology and whether participants need to reconnect.

Plan for regional placement, relay traffic, congestion, packet loss, and server failure. Monitor per-room and per-transport packet rates, egress, loss, jitter, retransmissions, CPU, and participant experience. Test quality adaptation under constrained bandwidth rather than relying only on ideal office-network calls.

### Key takeaways

- SFUs forward selected encoded streams; MCUs decode and create composed media.
- Mesh reduces media-server work but can grow expensive for endpoints as rooms grow.
- SFUs shift packet routing and egress costs to servers while leaving stream selection and decoding at clients.
- MCUs can simplify receivers at the cost of server processing, latency, and less per-source control.
- Choose based on room size, device capability, desired layout, bandwidth, and operational capacity.

## References

- [W3C: WebRTC 1.0](https://www.w3.org/TR/webrtc/)
- [mediasoup: Scalability](https://mediasoup.org/documentation/v3/scalability/)
- [IETF RFC 8834: Media Transport and Use of RTP in WebRTC](https://www.rfc-editor.org/rfc/rfc8834)
