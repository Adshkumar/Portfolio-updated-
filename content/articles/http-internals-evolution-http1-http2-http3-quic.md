---
title: "HTTP Internals: The Evolution from HTTP/1.1 to HTTP/2 and HTTP/3 QUIC"
description: "A deep dive into HTTP transport mechanics, framing layers, multiplexing, head-of-line blocking, and the UDP migration behind HTTP/3 QUIC."
slug: "http-internals-evolution-http1-http2-http3-quic"
date: "2026-10-26"
updated: "2026-11-02"
tags:
  - Networking
  - Protocols
  - HTTP
  - Performance
  - Distributed Systems
category: "Distributed Systems"
difficulty: "advanced"
published: true
featured: true
author: "Adarsh Kumar"
cover: null
---

HTTP is the shared language a client and server use to request resources and return responses. Its methods and status codes describe *what* a request means; its versions differ mainly in how those requests are framed and transported across a network.

That distinction matters when many requests share a connection. HTTP/2 can interleave request streams, while HTTP/3 uses QUIC to prevent loss on one stream from holding up delivery on every other stream. Neither version guarantees a faster application: server work, network quality, congestion, and deployment support still matter.

![Comparison of HTTP/1.1 connections, HTTP/2 multiplexed streams over TCP, and HTTP/3 streams over QUIC during packet loss](/articles/images/http-evolution-quic.svg "How packet loss affects streams in HTTP/1.1, HTTP/2, and HTTP/3")

Figure 1: HTTP/2 multiplexes streams but still depends on TCP's ordered byte delivery; one missing TCP segment can delay later bytes on that connection. QUIC isolates stream delivery so another stream can continue, although both still share path capacity and congestion control.

## The short version

Imagine a browser loading a page with a document, a stylesheet, and several images. HTTP/1.1 commonly uses multiple TCP connections to work on requests in parallel. HTTP/2 can carry many request streams on one TCP connection, which reduces connection overhead, but a lost TCP segment can temporarily delay bytes for every stream on that connection. HTTP/3 carries those streams over QUIC, so loss on one stream does not automatically stop delivery on the others.

| Version | What changes for the reader | Important limit |
| --- | --- | --- |
| HTTP/1.1 | Text-based messages; clients often open several connections for concurrency | Responses to pipelined requests must remain ordered; pipelining is uncommon |
| HTTP/2 | Binary frames let multiple streams share one connection | TCP still delivers one ordered byte stream, so packet loss can delay streams on that connection |
| HTTP/3 | HTTP semantics run over QUIC's independently delivered streams | Shared congestion, CPU, and network limits still affect the connection |

Use this comparison to understand a transport trade-off, not to assume that a newer version is always faster. Measure page or API latency on the networks and servers your users actually use.

## HTTP/1.1: Reuse without multiplexing

HTTP/1.1, specified by RFC 9112, allows a client to reuse a TCP connection for multiple requests. A client normally waits for each response before sending the next request on that connection. Pipelining—sending another request before the earlier response completes—is permitted, but responses must remain in request order, which can make a slow response hold up later ones. In practice, clients commonly use several connections when they need concurrency.

HTTP/1.1 does not define a multiplexing layer, so messages on a single connection are not independently framed as concurrent streams:

```text
HTTP/1.1 Request Pipeline:
Conn 1: Req A ──> Wait ──> Res A ──> Req B ──> ...
Conn 2: Req C ──> Wait ──> Res C ──> Req D ──> ...
```

### The Application Head-of-Line (HoL) blocking dilemma
When a client pipelines requests on one HTTP/1.1 connection, responses must arrive in request order:
1. Client sends Request 1 (an expensive database report taking 800 ms).
2. Client sends Request 2 (a tiny 5 ms asset lookup).
3. Even if the server computes Request 2 within 5 milliseconds, it **cannot transmit the bytes** until the entire response body of Request 1 has streamed across the socket.

Pipelining was specified but saw limited deployment. Ordered responses mean a later, quickly computed response cannot be sent ahead of an earlier response on the same connection. Client implementations have therefore often used multiple connections instead; the number of connections and pipelining support vary by client and deployment.

### Workarounds and their unintended costs
To render complex web pages requiring dozens of assets, browsers and engineering teams invented brittle application-layer workarounds:
- **Connection sharding**: Some sites split assets across hostnames to obtain more parallel connections. This can add DNS, TLS, and connection-management overhead; browser connection limits are implementation-dependent.
- **Asset Bundling and Image Sprites**: Compounding hundreds of small JavaScript files and PNGs into monolithic bundles to avoid round trips, destroying incremental client caching.

## HTTP/2: Binary framing and stream multiplexing

Specified by RFC 9113 (which obsoletes RFC 7540), **HTTP/2** preserves HTTP semantics such as methods, status codes, and fields while defining binary framing and multiplexed streams over a TCP connection.

### The Binary Framing Layer
HTTP/2 encodes messages as binary frames. A frame header identifies its length, type, flags, and stream; the maximum frame size is negotiated within protocol limits:

```text
+-----------------------------------------------+
| Length (24 bits) | Type (8) | Flags (8)       |
+-----------------------------------------------+
| R (1 bit) | Stream Identifier (31 bits)       |
+-----------------------------------------------+
| Frame Payload (0...16384 bytes)               |
+-----------------------------------------------+
```

Frame types include:
- `HEADERS` (0x01): Opens a stream and transmits compressed HTTP metadata.
- `DATA` (0x00): Carries stream payload chunks.
- `SETTINGS` (0x04): Negotiates stream limits, max frame sizes, and window buffers.
- `RST_STREAM` (0x03): Abruptly cancels an individual stream without severing the TCP connection.
- `WINDOW_UPDATE` (0x08): Implements credit-based flow control per stream and per connection.

### True stream multiplexing over a single TCP connection
HTTP/2 assigns each request-response pair an integer **Stream ID** (client-initiated streams use odd IDs; server-initiated streams use even IDs).
- Multiple streams can be interleaved over a single TCP connection.
- When the connection has no packet loss, a slow response on one stream does not require the server to finish that response before sending frames for another stream.
- HTTP/2 can reduce the need for many parallel connections, but connection limits, application design, and workload still matter.

### HPACK: State-synchronized header compression
HTTP requests repeatedly transmit identical headers (large JWT authorization cookies, User-Agents, Accept headers). HTTP/2 introduces **HPACK (RFC 7541)**:
- Uses a static table and an optional dynamic table whose state is maintained in order by both endpoints.
- A field can be represented by an indexed entry, a literal value, or a literal that adds an entry to the dynamic table; encoded size depends on the fields and table state.
- Sensitive fields can be encoded without dynamic indexing to reduce compression side-channel risks.

```text
HPACK Static Table (Sample):
Idx 2: :method: GET
Idx 3: :method: POST
Idx 4: :path: /
Idx 8: :status: 200
```

## The hidden flaw of HTTP/2: TCP transport head-of-line blocking

HTTP/2 allows frames from different streams to be interleaved, avoiding the HTTP/1.1 response-order constraint between requests. But HTTP/2 over TCP still depends on TCP's ordered byte delivery, so loss can delay delivery of later bytes on that connection. This is a transport trade-off, not a protocol vulnerability.

TCP guarantees an ordered, byte-for-byte reliable stream. To TCP, HTTP/2 frames are simply an opaque continuum of bytes.

```text
TCP Packet Stream over Single Socket:
[ Pkt 1: Stream 1 ] [ Pkt 2: Stream 3 ] [ Pkt 3: Stream 5 ]
         │ (Dropped on wireless network)
         ▼
Kernel holds Pkt 2 and Pkt 3 in socket buffer!
Streams 3 and 5 are completely frozen until Pkt 1 is retransmitted.
```

If a single network packet carrying part of Stream 1 is lost:
1. The receiving operating system's kernel TCP stack detects a gap in sequence numbers.
2. TCP may receive later bytes, but does not deliver them to the application as an ordered stream past the gap.
3. HTTP/2 cannot process later frame bytes on that TCP connection until the missing bytes are recovered.

The impact depends on the workload and path. Separate HTTP/1.1 connections have independent TCP delivery state, so loss on one connection need not stop delivery on another, though the connections still compete for shared network capacity. HTTP/2 uses fewer connections and can be more efficient, but a lost TCP segment can temporarily stall all streams sharing that connection. Benchmark representative clients and networks rather than assuming either version always wins.

## HTTP/3 and QUIC: UDP-based independent stream transport

To avoid TCP's cross-stream head-of-line blocking, the IETF standardized **QUIC (RFC 9000)** and **HTTP/3 (RFC 9114)**. QUIC runs over **UDP** and implements its own reliable, encrypted transport; many implementations run in user space, though implementation details vary.

```text
Protocol Stack Comparison:
HTTP/2:  [ HTTP/2 ] ──> [ TLS 1.3 ] ──> [ TCP  ] ──> IP
HTTP/3:  [ HTTP/3 ] ──> [      QUIC       ] ──> [ UDP  ] ──> IP
```

### 1. Reducing cross-stream transport head-of-line blocking
In QUIC, streams are first-class primitives inside the transport layer itself:
- Each stream maintains its own independent sequence numbers and flow control buffers.
- If data for Stream 1 is lost, data already received for Stream 3 can still be delivered to the application.
- The affected stream waits for its missing data, but all streams still share connection-level congestion control and can be affected by a congested path.

### 2. 0-RTT connection establishment
For a new HTTPS connection using TCP and a full TLS 1.3 handshake, the client normally completes the TCP and TLS handshakes before sending ordinary application data. The round-trip cost depends on the handshake mode and network; TLS resumption and TCP Fast Open can change it.

QUIC integrates transport and TLS 1.3 negotiation, allowing application data after a 1-RTT handshake on a new connection. On a resumed connection, 0-RTT early data may be sent before handshake completion; it can be replayed, so applications and servers must restrict early data to replay-safe operations.

```text
HTTP/3 0-RTT Flow:
Client                                           Server
  │                                                 │
  ├── Packet 1: [Initial + TLS Keys + GET /api] ───>│
  │                                                 ├── Process immediately
  │<── Packet 2: [ServerHello + 200 OK Body] ───────┤
```

### 3. Connection migration across network switches
TCP connections identify sessions using a 4-tuple: `(Source IP, Source Port, Destination IP, Destination Port)`.
- When a device changes networks, its IP address or port may change.
- A TCP connection is tied to its endpoint tuple; a path change commonly requires a new connection, and in-flight requests may need to be retried.

QUIC decouples identity from IP addresses using an explicit 64-bit **Connection ID (CID)**:
- A connection ID lets QUIC distinguish a connection from its current IP-and-port path.
- After a path change, QUIC validates the new path before relying on it. Migration can preserve a connection, but it is not guaranteed to be seamless in every network or deployment.

### 4. QPACK: Out-of-order header compression
Because QUIC streams arrive out of order, HTTP/2's HPACK cannot be used (a dropped header packet would desynchronize the entire dynamic table).

HTTP/3 introduces **QPACK (RFC 9204)**:
- Decouples header encoding across two dedicated uni-directional control streams (Encoder Stream and Decoder Stream).
- Allows headers to reference static entries immediately without waiting for dynamic table updates, avoiding head-of-line deadlocks across streams.

## Architectural comparison matrix

| Dimension | HTTP/1.1 | HTTP/2 | HTTP/3 |
| --- | --- | --- | --- |
| **Transport Layer** | TCP | TCP | QUIC over UDP (RFC 9000) |
| **Security / Encryption** | TLS is optional in the protocol; HTTPS is common | TLS is optional in the protocol; HTTPS is common | TLS 1.3 is integrated into QUIC |
| **Multiplexing Model** | Pipelining is ordered; clients commonly use several connections | Interleaved streams over one TCP connection | Independent streams over QUIC |
| **Cross-request ordering** | Pipelined responses are ordered on a connection | Streams can be interleaved independently | Streams can be interleaved independently |
| **Effect of packet loss**| A connection's ordered bytes are delayed | Loss on TCP can delay all streams on that connection | Loss of one stream's data need not block delivery on other streams |
| **Connection setup** | TCP and optional TLS handshakes | TCP and TLS in common deployments | QUIC integrates transport and TLS; 0-RTT is available only for eligible resumed connections |
| **Network Roaming** | A changed address generally requires a new connection | A changed address generally requires a new connection | Connection IDs can support validated path migration |

## Production trade-offs and operational realities

HTTP/3 can help on some networks, but adopting it requires evaluating infrastructure realities:

1. **Implementation and operations**: QUIC implementations handle transport, cryptography, loss recovery, and congestion control above UDP. CPU use and available packet-processing optimizations vary by implementation, kernel, and workload; benchmark the actual deployment.
2. **Network reachability**: Some paths or middleboxes restrict UDP. HTTP/3 deployments commonly advertise availability with `Alt-Svc` and retain a working alternative, but fallback behavior depends on the client and server.

### Summary
- HTTP versions retain HTTP's request and response semantics; they change framing and transport behavior.
- HTTP/2 is a useful multiplexing option, but packet loss on its TCP connection can delay all streams on that connection.
- HTTP/3's QUIC transport isolates stream delivery from that particular cross-stream blocking effect; it does not remove shared congestion or guarantee a speedup.
- Choose and tune protocol support based on measurements from your clients, infrastructure, and failure conditions.

## References

- [IETF RFC 9112: HTTP/1.1](https://www.rfc-editor.org/rfc/rfc9112)
- [IETF RFC 9113: HTTP/2](https://www.rfc-editor.org/rfc/rfc9113)
- [IETF RFC 9114: HTTP/3](https://www.rfc-editor.org/rfc/rfc9114)
- [IETF RFC 9000: QUIC Transport](https://www.rfc-editor.org/rfc/rfc9000)
- [IETF RFC 9001: Using TLS to Secure QUIC](https://www.rfc-editor.org/rfc/rfc9001)
- [IETF RFC 9293: Transmission Control Protocol](https://www.rfc-editor.org/rfc/rfc9293)
