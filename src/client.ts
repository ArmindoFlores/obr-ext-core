import type { AnyRegistry, MessageBase, MessageError, OBRSendDestination, OptionalKeys } from "./types";

import { APIError } from "./errors";
import OBR from "@owlbear-rodeo/sdk";

export class ClientAPI<MRegistry extends AnyRegistry = never> {
    sendChannel: string;
    receiveChannel: string;
    destination: OBRSendDestination;

    constructor(sendChannel: string, receiveChannel: string, destination?: OBRSendDestination) {
        this.sendChannel = sendChannel;
        this.receiveChannel = receiveChannel;
        this.destination = destination ?? "ALL";
    }

    async request<T extends keyof MRegistry>(message: OptionalKeys<MRegistry[T]["request"], "id">, timeoutMs: number = 15000): Promise<MRegistry[T]["response"] | MessageError> {
        const messageId = message.id ?? crypto.randomUUID();
        return await new Promise((resolve, reject) => {
            let interval: number;
            const unregister = OBR.broadcast.onMessage(this.receiveChannel, event => {
                const response = event.data as MessageBase;
                
                if (response.id !== messageId) return;
                if (typeof response.type !== "string") {
                    unregister();
                    reject(new APIError("Received malformatted message", response));
                    return;
                } 
                
                unregister();
                clearInterval(interval);
                resolve(response);
            });
            interval = window.setTimeout(() => {
                unregister();
                reject(new APIError(
                    "Timed out while waiting for response",
                    { message }
                ));
            }, timeoutMs);
            OBR.broadcast.sendMessage(
                this.sendChannel,
                {...message, id: messageId},
                { destination: this.destination }
            );
        });
    }
}
