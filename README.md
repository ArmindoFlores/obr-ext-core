# obr-ext-core

A lightweight TypeScript library for building typed request/response APIs on top of [Owlbear Rodeo's](https://owlbear.rodeo) broadcast channel feature.

## Requirements

This library requires [`@owlbear-rodeo/sdk`](https://www.npmjs.com/package/@owlbear-rodeo/sdk) to be installed in your project.

```sh
npm install @owlbear-rodeo/sdk
```

## Installation

```sh
npm install @armindoflores/obr-ext-core
```

## Overview

This library lets you define a typed message registry and use it to build a type-safe communication between an extension's client and handler sides over OBR broadcast channels.

The two main classes are:

- `ClientAPI` - sends requests and waits for a matching response
- `APIHandler` - listens for incoming requests, dispatches them to registered handlers, and sends back responses

## Usage

### 1. Define your message registry

Start by defining your request/response message pairs and grouping them into a registry type.

```typescript
import type { MessageBase } from "@armindoflores/obr-ext-core";

interface MessagePathfind extends MessageBase {
    type: "PATHFIND";
    from: { x: number; y: number };
    to:   { x: number; y: number };
}

interface MessagePathfindResponse extends MessageBase {
    type: "PATHFIND";
    distance: number;
    path: { x: number; y: number }[];
}

type MyRegistry = {
    PATHFIND: {
        request:  MessagePathfind;
        response: MessagePathfindResponse;
    };
};
```

Each key in the registry maps a message type to its `request` and `response` shapes. Both must extend `MessageBase` (which requires an `id: string` and `type: string`).

### 2. Set up the handler
The handler will be responsible for processing messages sent by clients. It can define a number of handlers and respond to each message type.

```typescript
import { APIHandler } from "@armindoflores/obr-ext-core";

const handler = new APIHandler<MyRegistry>("com.example.ext/response", "com.example.ext/request");

handler.setHandler("PATHFIND", (message) => {
    // message is typed as MessagePathfind
    const path = computePath(message.from, message.to);
    return {
        // no need to include the id, that is done automatically
        type: "PATHFIND",
        distance: path.distance,
        path: path.points,
    };
});

// To actually enable listening for messages
OBR.onReady(() => {
    handler.register();
});
```

### 3. Send requests
```typescript
import { ClientAPI, isErrorMessage } from "@armindoflores/obr-ext-core";

const client = new ClientAPI<MyRegistry>("com.example.ext/request", "com.example.ext/response");

const result = await client.request({
    id: "something",  // optional, will default to a random ID
    type: "PATHFIND",
    from: { x: 0, y: 0 },
    to:   { x: 5, y: 5 },
});

if (isErrorMessage(result)) {
    console.error("Request failed:", result.error);
} else {
    // result is typed as MessagePathfindResponse
    console.log("Distance:", result.distance);
    console.log("Path:", result.path);
}
```
