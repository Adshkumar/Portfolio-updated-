---
title: "Why gRPC Uses HTTP/2"
description: "See how gRPC maps calls, messages, metadata, and status onto HTTP/2, why multiplexing and streaming matter, and where the transport still has limits."
slug: "why-grpc-uses-http2"
date: "2026-11-02"
tags:
  - gRPC
  - HTTP
  - Distributed Systems
  - Networking
category: "Distributed Systems"
difficulty: "intermediate"
published: true
featured: false
author: "Adarsh Kumar"
cover: null
---

gRPC uses HTTP/2 as its standard transport because HTTP/2 provides persistent connections, concurrent streams, framing, and flow control that fit the needs of service-to-service calls and streaming. gRPC builds its own service-call protocol on top of those HTTP/2 capabilities.

The layers are easier to understand separately:

- **HTTP/2** moves framed data over a connection and identifies concurrent streams.
- **gRPC** maps each remote procedure call (RPC) to an HTTP/2 stream and defines how messages, metadata, deadlines, and RPC status travel on it.
- **Protocol Buffers** is the common way to define service and message types and encode message payloads; gRPC can also use other supported serialization formats.

![gRPC call layered over HTTP/2 and TCP, showing an RPC stream carrying headers, messages, and trailers](/articles/images/grpc-http2-layers.svg "How gRPC maps an RPC onto HTTP/2")

Figure 1: One gRPC RPC uses an HTTP/2 stream. Request and response headers carry call metadata, DATA frames carry length-prefixed gRPC messages, and trailing headers carry the final gRPC status. Multiple RPC streams can share an HTTP/2 connection.

## Start with the problem gRPC needs to solve

Suppose a checkout service needs to ask an inventory service to reserve an item. The services need a way to identify the operation, encode the request and response, and carry the result back. If many services do this at once, they also need an efficient way to manage concurrent calls over the network.

HTTP/2 is a useful foundation for that transport problem: it allows concurrent streams on one connection rather than requiring a separate connection for every call. gRPC adds the RPC-specific contract and message rules. HTTP/2 by itself does **not** define a typed `Reserve` method, generate client code, or decide what “item unavailable” means.

If RPC itself is new, start with [RPC Explained: Remote Procedure Calls from First Principles](/articles/rpc-remote-procedure-calls-explained).

## How one RPC maps onto HTTP/2

A typical gRPC unary call can be followed from start to finish:

1. The client stub selects a service method, such as `/inventory.v1.Inventory/Reserve`, and encodes a request message.
2. It opens an HTTP/2 stream on a connection to the server.
3. HTTP/2 `HEADERS` frames carry the method path (for example, `/inventory.v1.Inventory/Reserve`), the `application/grpc` content type, and optional metadata. A deadline is commonly represented by `grpc-timeout`.
4. HTTP/2 `DATA` frames carry gRPC message bytes. Each gRPC message begins with a 5-byte prefix: one compressed flag byte and a four-byte message length. The message can span DATA frames; HTTP/2 frame boundaries and gRPC message boundaries are separate.
5. The server dispatches the method, decodes the request, and runs its handler.
6. Response `DATA` frames carry response messages. HTTP/2 trailing headers carry the final gRPC status, such as `grpc-status: 0` for success; they may also include status details or application trailers.

The HTTP status and gRPC status are not interchangeable. An HTTP response can have status `200` while the gRPC trailers report an application-level RPC error. A gRPC client must interpret the gRPC status, not treat HTTP `200` alone as proof that the operation succeeded.

## Why HTTP/2 fits gRPC

### Multiple calls can share a connection

Each HTTP/2 stream has its own identifier. A gRPC channel can use a long-lived HTTP/2 connection, and concurrent RPCs can use different streams on that connection. This reduces connection setup overhead compared with opening a new TCP connection for every call.

Multiplexing does not mean the calls are one transaction. Each RPC still has its own request, response, deadline, cancellation, and status. Nor does HTTP/2 guarantee that every RPC will finish faster; server work, network latency, and contention still matter.

### The same transport supports streaming

gRPC supports four common call shapes:

| RPC shape | Client sends | Server sends | Typical example |
| --- | --- | --- | --- |
| Unary | One message | One message | Read a product |
| Server streaming | One message | A sequence of messages | Watch a job's progress |
| Client streaming | A sequence of messages | One message | Upload a batch, then get a summary |
| Bidirectional streaming | A sequence of messages | A sequence of messages | Interactive control or telemetry |

HTTP/2 streams provide the long-lived bidirectional path that these message patterns need. gRPC defines when each side has finished sending and how the final status is delivered.

### Headers, trailers, and flow control have useful roles

HTTP/2 headers carry the method and metadata at the start of a call. Trailers let gRPC return its final status after response messages have been sent. This matters for streaming: the server may send several messages and only then report whether the call completed successfully.

HTTP/2 also defines flow control at the connection and stream levels. It helps a receiver regulate how much data a sender transmits. Flow control is not an application queue limit or a guarantee of unlimited buffering: applications still need to read streams and handle backpressure.

### It reuses familiar network infrastructure

Because gRPC is carried over HTTP/2, it can use HTTP/2-aware TLS, proxies, and network tooling. That can simplify connections between services, but an intermediary must correctly support gRPC's streaming and trailers. A proxy that buffers or strips trailers can break behavior even if it accepts an HTTP/2 connection.

TLS is commonly used to protect gRPC traffic, but encryption and peer authentication are deployment configuration choices, not a benefit that follows merely from selecting HTTP/2. Configure transport security and application authorization for the environment.

## What HTTP/2 does not solve

### TCP loss can still delay all streams on a connection

HTTP/2 multiplexes streams at the application protocol layer, but it typically runs over TCP. TCP delivers an ordered byte stream. If a TCP segment is lost, later bytes on that connection cannot be delivered to HTTP/2 until the missing bytes are retransmitted. As a result, packet loss can temporarily delay multiple RPC streams sharing that connection.

HTTP/2 prevents one slow RPC handler from forcing every other response to wait for its application-level turn, but it cannot remove TCP's transport-level head-of-line blocking. HTTP/3 uses QUIC to change that transport behavior; it is a separate protocol and is not the standard transport for gRPC's HTTP/2 protocol.

### A connection is not the same as a load-balancing strategy

If a client sends every RPC through one long-lived connection, a proxy or server may see that as one connection even though it carries many calls. Distributing traffic across backend servers requires an appropriate resolver, load balancer, proxy, or client-side connection strategy. Simply adding more HTTP/2 streams does not spread one connection across multiple servers.

Servers may also limit the number of concurrent streams on a connection. A client library can queue calls or open additional connections, depending on implementation and configuration. Measure per-connection load, stream limits, and backend distribution when a gRPC service is unevenly loaded.

### A deadline does not roll back completed work

gRPC deadlines let a client stop waiting after a specified time. The server can observe cancellation and stop work that is no longer needed, but cancellation may arrive after a side effect has already happened. A client retrying after `DEADLINE_EXCEEDED` must not assume that the first attempt did nothing. Use idempotency or deduplication for operations that cannot safely run twice.

## When to choose gRPC

gRPC is often a good fit for internal service APIs when you need generated clients, strongly described request and response types, cross-language support, or streaming. It requires compatible gRPC libraries and HTTP/2-capable intermediaries, and its binary messages are less convenient to inspect manually than ordinary JSON over HTTP.

Choose based on the clients and operational environment:

- Prefer gRPC when typed contracts, code generation, and streaming are important.
- Prefer ordinary HTTP/JSON when browser compatibility, easy manual inspection, or broad support from generic tools is more important.
- For either approach, define deadlines, authentication, authorization, retry behavior, and compatibility rules explicitly.

## Key takeaways

- HTTP/2 is gRPC's transport; gRPC adds the RPC methods, message framing, metadata, and status semantics.
- A gRPC call maps to an HTTP/2 stream. DATA frames carry length-prefixed gRPC messages, and trailers carry final status.
- Multiplexing and streaming make one persistent connection useful for many concurrent calls, but do not remove server bottlenecks or TCP loss effects.
- HTTP/2 packet loss can delay all streams on the same TCP connection. HTTP/3/QUIC has different transport behavior but is not the protocol described by standard gRPC over HTTP/2.
- Deadlines and cancellation help bound work, but they do not prove that a timed-out operation had no side effects.

## References

- [gRPC: Core concepts, architecture, and lifecycle](https://grpc.io/docs/what-is-grpc/core-concepts/)
- [gRPC over HTTP/2 protocol](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md)
- [IETF RFC 9113: HTTP/2](https://www.rfc-editor.org/rfc/rfc9113)
- [gRPC: Deadlines](https://grpc.io/docs/guides/deadlines/)
- [Protocol Buffers: Overview](https://protobuf.dev/overview/)
