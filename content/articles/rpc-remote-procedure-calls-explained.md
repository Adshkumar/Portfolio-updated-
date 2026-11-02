---
title: "RPC Explained: Remote Procedure Calls from First Principles"
description: "Learn what an RPC is, how a local-looking function call crosses a network, and how serialization, deadlines, retries, and failures change the design."
slug: "rpc-remote-procedure-calls-explained"
date: "2026-11-02"
tags:
  - Backend Engineering
  - Distributed Systems
  - API Design
  - Networking
category: "Backend Engineering"
difficulty: "beginner"
published: true
featured: false
author: "Adarsh Kumar"
cover: null
---

An **RPC (Remote Procedure Call)** lets one program ask another program to run an operation and return a result. For example, an order service might call `Inventory.Reserve(itemId, quantity)` on an inventory service running on another machine.

The code can look like an ordinary function call, but the operation crosses a network. The request must be encoded, sent, received, decoded, executed, and answered. The connection can fail or the response can arrive too late. Thinking about those steps is the key to understanding RPC.

![An RPC call travels from a client stub across a network to a server handler, then returns a response or an error](/articles/images/rpc-request-lifecycle.svg "RPC request and response lifecycle")

Figure 1: A local-looking method call becomes a network exchange. The client stub encodes the request; the server decodes it and calls the handler; the response follows the reverse path. Network, encoding, and server failures can interrupt any step.

## A familiar example

Imagine an online store checking whether a product is available. The order service needs to ask the inventory service:

```text
Reserve(item_id = "book-42", quantity = 1)
```

With an RPC client library, application code might look like this:

```js
const result = await inventoryClient.reserve({
  itemId: "book-42",
  quantity: 1,
});
```

The client method is a **stub**: a local proxy that packages the call and communicates with the remote service. The inventory server receives the request, runs its `Reserve` handler, and sends back a result such as `{ reserved: true }`.

The important distinction is that `inventoryClient.reserve(...)` is not an ordinary in-process function call. It may take hundreds of milliseconds, fail because the server is unreachable, time out after the server has already made the reservation, or return an application error. The `await` tells this JavaScript caller to wait asynchronously; it does not make the network reliable.

## What happens during an RPC?

An RPC typically has these parts:

1. **Define the operation and data.** Client and server agree on an operation such as `Reserve` and the shape of its request and response.
2. **Serialize the request.** The client converts structured values into bytes. This representation is called the wire format.
3. **Send the request.** A transport—such as HTTP/2, HTTP/1.1, or a message protocol—moves the bytes to the server.
4. **Dispatch and execute.** The server identifies the operation, decodes the request, runs application logic, and creates a response.
5. **Return a result or error.** The client decodes the response and receives either a result or an error describing what it could observe.

Each library may hide most of this work, but the steps still happen. A useful way to debug an RPC is to ask which step failed: did the client connect, did the server receive the request, did the handler run, and did a response get back before the deadline?

## The interface is a contract

The service definition is the agreement shared by both sides. It describes the available methods and the types of their inputs and outputs. A schema or interface definition language (IDL) can generate client stubs and server interfaces in multiple programming languages.

For example, a small Protocol Buffers service might be:

```proto
syntax = "proto3";

service Inventory {
  rpc Reserve (ReserveRequest) returns (ReserveResponse);
}

message ReserveRequest {
  string item_id = 1;
  int32 quantity = 2;
}

message ReserveResponse {
  bool reserved = 1;
}
```

The `.proto` file is the contract; generated code helps each language encode, decode, and call it consistently. Protocol Buffers is one common choice, not a requirement for RPC. JSON, XML, and custom formats can also carry remote calls.

Once deployed, a contract needs compatibility rules. A new client may talk to an older server, or vice versa, during a rolling release. Additive changes are generally easier to roll out than renaming or reinterpreting existing fields. With Protocol Buffers, field numbers are part of the wire format and should not be reused after a field is removed.

## RPC is a family, not one protocol

RPC describes a programming model: call an operation on another process and exchange request and response data. It does not specify one universal network protocol.

| Style | Message pattern | Example |
| --- | --- | --- |
| Unary | One request, one response | `GetProduct(id) -> Product` |
| Server streaming | One request, a stream of responses | `WatchOrder(id) -> updates...` |
| Client streaming | A stream of requests, one response | Upload measurements, then receive a summary |
| Bidirectional streaming | Both sides exchange streams | A long-lived device-control session |

Implementations make different design choices. REST exposes resources and uses HTTP methods and status codes. JSON-RPC defines a JSON-based request/response format. gRPC defines service calls and supports streaming, usually with Protocol Buffers and HTTP/2. These approaches can overlap; RPC is not synonymous with gRPC.

For more on the transport used by gRPC, see [Why gRPC Uses HTTP/2](/articles/why-grpc-uses-http2).

## The hard part: a network call is not a local call

Local function calls usually have predictable control flow: the function either returns or throws within the same process. With RPC, the client can lose contact at any point.

Consider the inventory example:

1. The client sends `Reserve`.
2. The inventory server reserves the item.
3. The server sends `{ reserved: true }`.
4. The response is lost, so the client sees a timeout.

The client cannot infer from the timeout that the reservation failed. Retrying blindly might reserve twice or duplicate another side effect. For operations that may be retried, use idempotent semantics or a deduplication key and understand the server's retry behavior. See [Idempotency, Retries, and Duplicate Processing](/articles/idempotency-and-retries).

Set a **deadline**: the latest time the caller is willing to wait. Pass the remaining time to downstream calls where the RPC framework supports deadline propagation. When the deadline expires, the client can stop waiting, but the server must cooperate with cancellation to stop work that is no longer useful.

Also distinguish transport errors from application results. “Could not connect,” “deadline exceeded,” and “item is out of stock” describe different outcomes and should lead to different handling.

## When is RPC a good fit?

RPC is useful when:

- A service needs to invoke a well-defined operation on another service.
- Multiple languages need to share a typed service contract.
- Low-overhead structured messages or long-lived streaming interactions are useful.
- Internal services benefit from generated clients and consistent method signatures.

It may be less suitable when an interface needs to be easily explored by browsers or generic HTTP tools, when clients and servers are independently developed without a shared schema process, or when long-lived synchronous dependencies make the system difficult to operate. An RPC abstraction can make a remote dependency look deceptively local, so deadlines, observability, authorization, and failure handling still need to be explicit.

## Key takeaways

- RPC lets one process request an operation from another; the remote call only *looks* like a local method call.
- A stub, a wire format, a transport, a server handler, and an error/result path work together to complete a call.
- RPC is a programming model, not a single protocol. gRPC is one RPC framework; REST and JSON-RPC are different interface styles.
- Networks introduce latency, timeouts, partial failure, and duplicate attempts. Set deadlines and make retries safe for the operation.
- Treat service definitions as versioned contracts shared by independently deployed clients and servers.

## References

- [gRPC: Introduction](https://grpc.io/docs/what-is-grpc/introduction/)
- [gRPC: Core concepts, architecture, and lifecycle](https://grpc.io/docs/what-is-grpc/core-concepts/)
- [Protocol Buffers: Overview](https://protobuf.dev/overview/)
- [Protocol Buffers: Proto3 language guide](https://protobuf.dev/programming-guides/proto3/)
- [gRPC: Deadlines](https://grpc.io/docs/guides/deadlines/)
