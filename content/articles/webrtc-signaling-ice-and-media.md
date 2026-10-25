---
title: "WebRTC Connections: Signaling, ICE, and Media Flow"
description: "Understand what WebRTC provides, what an application must build, and how SDP, ICE, DTLS, and SRTP fit into a peer connection."
slug: "webrtc-signaling-ice-and-media"
date: "2026-10-25"
tags:
  - WebRTC
  - Real-Time Communications
  - Networking
category: "Backend Engineering"
difficulty: "intermediate"
published: true
featured: false
author: "Adarsh Kumar"
cover: null
---

WebRTC lets browsers and other compatible endpoints exchange real-time audio, video, and data. It handles media capture APIs, codecs, congestion control, and secure media transport, but it does **not** define how your application finds another user or exchanges the connection setup messages.

That distinction explains why a "WebRTC call" usually includes an application signaling service in addition to the peer connection.

## The pieces that establish a call

The application first uses its own signaling channel—often WebSocket or HTTPS—to exchange session descriptions and network candidates. Session Description Protocol (SDP) describes media sections, codecs, and transport parameters. Interactive Connectivity Establishment (ICE) gathers possible network paths and tests which one can carry traffic.

![WebRTC setup flow with application signaling, ICE connectivity checks, and encrypted media](/articles/images/webrtc-connection-flow.svg "WebRTC signaling and media connection flow")

Figure 1: Signaling carries setup messages through the application's server; once ICE finds a usable path, encrypted media can flow directly between endpoints or through a TURN relay. The signaling server is not normally in the media path.

The diagram shows a common two-party setup, not every valid SDP negotiation or deployment. An application can use different signaling protocols, and media can be relayed even when a direct network path is available.

## Offer, answer, and trickle candidates

One endpoint creates an offer and sends it over the application's signaling channel. The other endpoint applies the offer, creates an answer, and sends that back. Both sides configure their peer connection from the negotiated descriptions.

ICE candidate gathering can continue while this exchange takes place. With **trickle ICE**, candidates are sent as they are discovered rather than waiting for gathering to finish. The application must deliver candidates to the correct peer connection and handle candidates that arrive before or after the remote description is applied.

SDP is negotiation data, not a signaling transport. The application is responsible for authentication, call membership, message routing, reconnection, and deciding who is allowed to join. Do not trust a client-supplied room or peer identifier without authorization checks.

## NAT traversal and TURN

ICE gathers candidate addresses from available interfaces and, in many cases, from a STUN server that helps discover a public-facing address. Connectivity checks test candidate pairs to find a working route through firewalls and Network Address Translators (NATs).

Some networks block all usable direct paths. A TURN server can relay the encrypted media packets between endpoints. TURN improves reachability but adds bandwidth cost, relay capacity requirements, and another service to monitor. A system should plan for relay traffic instead of assuming every call will be peer-to-peer.

After a path is selected, DTLS establishes keying material and SRTP protects real-time media. Applications should use current browser APIs and secure origins, and should not attempt to replace WebRTC's transport security with custom encryption schemes.

## What changes as a call grows

In a one-to-one call, each endpoint can send media to the other. In a group call, a full mesh makes every participant send separate streams to every other participant. That can increase each user's upload work and network usage as the room grows.

For larger rooms, a server may receive and forward media as a Selective Forwarding Unit (SFU), or decode and compose media as a Multipoint Conferencing Unit (MCU). Those architectures move complexity and bandwidth to server infrastructure; they do not change the need for application-level signaling.

## Debugging the connection lifecycle

Track the stages separately: signaling connected, offer/answer exchanged, ICE gathering completed, selected candidate-pair type, DTLS connected, and media flowing. A successful signaling connection does not prove that media can traverse the network.

When diagnosing a call, identify whether the selected path is host, server-reflexive, or relayed. Inspect packet loss, round-trip time, jitter, and bitrate over time. Avoid logging raw SDP or candidate details to broadly accessible systems without reviewing privacy and retention implications.

### Key takeaways

- WebRTC provides media and transport capabilities; applications still implement signaling.
- SDP describes a negotiated session, while ICE discovers and checks usable network paths.
- TURN relay is essential for some network conditions and should be included in capacity planning.
- A connected signaling socket does not mean the media path is working.
- Group-call architecture often needs an SFU or MCU instead of a full peer mesh.

## References

- [W3C: WebRTC 1.0](https://www.w3.org/TR/webrtc/)
- [RFC 8445: ICE](https://www.rfc-editor.org/rfc/rfc8445)
- [RFC 8825: WebRTC Overview](https://www.rfc-editor.org/rfc/rfc8825)
- [RFC 8835: WebRTC Transports](https://www.rfc-editor.org/rfc/rfc8835)
