---
title: "WebRTC Connections: Signaling, ICE, and Media Flow"
description: "Understand what WebRTC provides, what an application must build, and how SDP, ICE, DTLS, and SRTP fit into a peer connection."
slug: "webrtc-signaling-ice-and-media"
date: "2026-10-25"
updated: "2026-11-02"
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

WebRTC is a set of browser and native APIs and protocols for real-time audio, video, and data communication. It can establish a direct peer connection, but the actual route may use a relay, and latency depends on the network, devices, and application.

However, WebRTC **deliberately does not define a signaling protocol**. It does not specify how peers discover each other, how call invitations are routed, how authentication is verified, or how network metadata is exchanged.

To deploy real-time communications in production, engineers must understand the entire protocol stack: application signaling, the Offer/Answer model, Interactive Connectivity Establishment (ICE), NAT traversal mechanics, and encrypted media transport.

![WebRTC setup flow with application signaling, ICE connectivity checks, and encrypted media](/articles/images/webrtc-connection-flow.svg "WebRTC signaling and media connection flow")

Figure 1: The two-phase WebRTC connection lifecycle. Phase 1 (Control Plane): The application signaling server (WebSocket/HTTPS) routes authentication and SDP Offer/Answer/ICE metadata between peers. Phase 2 (Data Plane): ICE checks determine the network path, DTLS performs the cryptographic key exchange, and encrypted media (SRTP) flows directly peer-to-peer or relays through TURN.

## The call setup in plain language

WebRTC handles the media connection, but an application still needs a way for people to find each other and exchange setup messages. That exchange is **signaling**, commonly implemented with a WebSocket or HTTPS API; WebRTC does not prescribe one signaling service.

One peer sends an offer describing its media and network options. The other returns an answer. Both sides exchange ICE candidates—possible network paths—and test which paths work. Once a path is selected, DTLS establishes keys and media is protected with SRTP. If a direct path cannot be established, a TURN server can relay packets. These are separate jobs: signaling carries setup information, while the selected ICE path carries media and data.

## The WebRTC protocol stack

WebRTC is not a single protocol; it is a layered suite of standardized networking protocols:

```text
Application signaling (outside the media path)
  └── Exchanges SDP descriptions and ICE candidates

Selected ICE path (often UDP; TURN may relay over UDP/TCP/TLS)
  ├── Media: RTP/RTCP protected as SRTP/SRTCP
  │            └── Keys established with DTLS-SRTP
  └── DataChannel: SCTP over DTLS
```

1. **Signaling (outside WebRTC)**: An application protocol, often WebSocket or HTTPS, exchanges session descriptions, ICE candidates, and application messages.
2. **SDP (Session Description Protocol - RFC 8866)**: Describes media sections, codecs, directions, and DTLS fingerprints; it is exchanged through signaling.
3. **ICE (RFC 8445)**: Gathers candidate endpoints and checks candidate pairs. STUN helps discover addresses and perform checks; TURN provides a relay when a usable direct path is unavailable.
4. **DTLS**: Runs over the selected ICE path to authenticate the peer certificate against the SDP fingerprint and establish keys.
5. **SRTP / SRTCP (RFC 3711)**: Protects RTP media and RTCP control traffic using keys established with DTLS-SRTP.
6. **SCTP (RFC 8831)**: Carries WebRTC DataChannels over DTLS; reliability and ordering are configurable per data channel.

## The SDP Offer/Answer negotiation model

Peers establish a session through an **Offer/Answer exchange** mediated by the application's signaling server. Modern browsers strictly implement the W3C **Unified Plan** specification.

```text
Peer A            Signaling Server        Peer B
  │                      │                  │
  ├── 1. createOffer()   │                  │
  ├── 2. setLocalDesc()  │                  │
  ├── 3. Send offer ────>│── Forward ──────>│
  │                      │                  ├── 4. setRemoteDesc()
  │                      │                  ├── 5. createAnswer()
  │                      │                  ├── 6. setLocalDesc()
  │                      │<── Send answer ──┤
  │<── Forward ──────────┤                  │
  ├── 7. setRemoteDesc() │                  │
  └── (DTLS Handshake on ICE Candidate) ────┘
```

### Anatomy of an SDP session description
An SDP payload contains media descriptions (`m=`), codec parameters (`a=rtpmap`), and cryptographic fingerprints:

```text
v=0
o=- 4289104812 2 IN IP4 127.0.0.1
s=-
t=0 0
# Multiplex all media over a single UDP port
a=group:BUNDLE 0 1
# Audio track: Opus codec at 48kHz
m=audio 9 UDP/TLS/RTP/SAVPF 111
a=mid:0
a=rtpmap:111 opus/48000/2
# Illustrative placeholders only; real values are generated per session.
a=ice-ufrag:x8B2
a=ice-pwd:9K1pQ3vX7mZ
a=fingerprint:sha-256 4A:72:6B:...
# Video track: VP8 codec
m=video 9 UDP/TLS/RTP/SAVPF 96
a=mid:1
a=rtpmap:96 VP8/90000
```

- **`a=group:BUNDLE`**: Groups media sections so they can share a transport when both peers support the negotiated bundle policy. The exact sections and transport use depend on the offer/answer; it is not simply a command to multiplex every kind of traffic.
- **`a=fingerprint`**: Identifies the certificate expected during the DTLS handshake. The peer checks that the presented certificate matches the fingerprint carried in the session description. This binding depends on protecting signaling from tampering; a fingerprint alone does not authenticate an untrusted signaling channel.

## ICE and Trickle ICE mechanics

Connecting two devices across the Internet is difficult because most consumer and corporate devices do not have public IP addresses. They reside behind Network Address Translators (NATs) and firewalls.

### ICE candidate types
ICE can use several kinds of candidate. Their priority and the selected path depend on the ICE agent, configuration, and connectivity checks; this is not a fixed preference order:
1. **Host (`host`)**: Local IP addresses assigned directly to physical or virtual network interface cards (e.g., `192.168.1.50` or `10.0.0.12`).
2. **Server Reflexive (`srflx`)**: An address and port observed by a STUN server for the client's request. It can be useful to test, but does not prove that a peer can reach it.
3. **Peer Reflexive (`prflx`)**: An endpoint discovered during connectivity checks when the source address observed by the peer differs from the signaled candidate.
4. **Relay (`relay`)**: A public IP and port allocated on a dedicated **TURN** (Traversal Using Relays around NAT - RFC 8656) server.

### Why Trickle ICE is commonly used
Without trickling, an application can wait for candidate gathering to finish before sending a complete offer or answer. This may add setup delay, but the amount depends on candidate sources, network behavior, and application signaling.

Under **Trickle ICE (RFC 8838)**:
1. Peers can exchange an initial SDP offer or answer before gathering has finished.
2. As local ICE agents discover candidates asynchronously, the application fires the `onicecandidate` event.
3. Candidates can be sent incrementally through the application's signaling channel. The message format is application-defined; one example is:
   `{"type": "candidate", "candidate": "candidate:84217 ... typ srflx raddr 192.168.1.50 rport 54120"}`
4. Peers can test candidate pairs while gathering continues, which can reduce setup delay. Actual time-to-first-media depends on the network, relay availability, and application signaling.

## NAT traversal and when TURN is needed

STUN works by having a client send a UDP binding request to a public STUN server. The server replies with the client's public-facing IP and port. This mapped endpoint can help peers attempt a direct path, but discovering an address does not prove that another peer can reach it. ICE connectivity checks determine which candidate pairs work.

NAT and firewall behavior varies. Some mappings are destination-dependent, and some networks restrict UDP or prevent direct connectivity checks. A STUN-discovered address alone cannot establish that a peer-to-peer path will work.

```text
[ Client (192.168.1.10) ]
       │
       └──> NAT Router ──> STUN (1.1.1.1)
                │
         (Port: 20001)

[ Client (192.168.1.10) ]
       │
       └──> NAT Router ──> Peer B (2.2.2.2)
                │
         (Symmetric NAT opens Port 35892!)
```

Some NATs allocate destination-dependent mappings, and some firewalls block the connectivity checks needed for a direct path. In those cases, a direct candidate pair may fail; ICE can select a relay candidate if a TURN server is available.

**TURN relays**
A TURN server provides a relay candidate when ICE cannot use a direct candidate pair or policy requires relaying. The peer sends media over its client-to-TURN allocation; TURN forwards packets to the other peer. The transport can use UDP or, where configured and supported, TCP/TLS. Media remains protected end-to-end between peers by SRTP.
- TURN relays add bandwidth and operating cost, so deployments should measure relay usage and plan capacity for it.
- Restrict relay access with time-limited credentials or another appropriate authorization mechanism; do not expose an unauthenticated, open relay.

## Diagnostics, telemetry, and debugging

Real-time media issues need media and transport telemetry in addition to HTTP logs. `RTCPeerConnection.getStats()` exposes counters and measurements; sampling cadence should fit the application's observability and overhead requirements:

```javascript
const stats = await peerConnection.getStats();
stats.forEach((report) => {
  if (report.type === 'inbound-rtp' &&
      report.kind === 'video') {
    const lost = report.packetsLost;
    const jitter = report.jitter;
    const dropped = report.framesDropped;
    const nacks = report.nackCount;
  }
  if (report.type === 'candidate-pair' &&
      report.state === 'succeeded') {
    // Network RTT in seconds
    const rtt = report.currentRoundTripTime;
    const bytes = report.bytesSent;
    const bitrate =
      report.availableOutgoingBitrate;
  }
});
```

Interpret telemetry in context and over time:
- **Round-trip time**: Track changes and compare against the application's latency objectives; RTT alone is not end-to-end media delay.
- **Packet loss**: `packetsLost` is a counter, so calculate deltas over a sampling interval and correlate with retransmissions, concealment, and user impact.
- **Jitter and playout**: Relate reported jitter to jitter-buffer delay, concealment, freezes, and audio quality. A single threshold does not predict quality across codecs and devices.

### Key takeaways

- WebRTC handles media capture, hardware encoding, and encrypted transport; the application must build the signaling plane.
- The Offer/Answer exchange uses SDP Unified Plan to negotiate codecs, media configurations, and DTLS fingerprints.
- Trickle ICE can reduce setup delay by allowing checks to start before gathering finishes; it does not guarantee a particular connection time.
- STUN can help discover and test candidate addresses, but it does not guarantee a direct path. Use TURN when direct connectivity fails or policy requires relaying.
- Continuous telemetry via `getStats()` is essential to observe real-time packet loss, jitter, RTT, and candidate-pair states.

## References

- [W3C Recommendation: WebRTC 1.0: Real-Time Communication Between Browsers](https://www.w3.org/TR/webrtc/)
- [IETF RFC 8445: Interactive Connectivity Establishment (ICE)](https://www.rfc-editor.org/rfc/rfc8445)
- [IETF RFC 8866: Session Description Protocol (SDP)](https://www.rfc-editor.org/rfc/rfc8866)
- [IETF RFC 5764: DTLS Extension to Establish Keys for SRTP](https://www.rfc-editor.org/rfc/rfc5764)
- [IETF RFC 8656: Traversal Using Relays around NAT (TURN)](https://www.rfc-editor.org/rfc/rfc8656)
- [IETF RFC 8838: Trickle ICE](https://www.rfc-editor.org/rfc/rfc8838)
