import OBR from "@owlbear-rodeo/sdk";
import type { OBRSendDestination, AnyRegistry, MessageBase, MessageError, OptionalKeys } from "./types";
import { APIError } from "./errors";

export class ClientAPI<MRegistry extends AnyRegistry = never> {
    sendChannel: string;
    receiveChannel: string;
    destination: OBRSendDestination;

    constructor(sendChannel: string, receiveChannel: string, destination?: OBRSendDestination) {
        this.sendChannel = sendChannel;
        this.receiveChannel = receiveChannel;
        this.destination = destination ?? "ALL";
    }

    async request<T extends keyof MRegistry>(message: OptionalKeys<MRegistry[T]["request"], "id">): Promise<MRegistry[T]["response"] | MessageError> {
        const messageId = message.id ?? crypto.randomUUID();
        return await new Promise((resolve, reject) => {
            const unregister = OBR.broadcast.onMessage(this.receiveChannel, event => {
                const response = event.data as MessageBase;

                if (response.id !== messageId) return;
                if (typeof response.type !== "string") {
                    unregister();
                    reject(new APIError("Received malformatted message", response));
                    return;
                } 

                unregister();
                resolve(response);
            });
            OBR.broadcast.sendMessage(
                this.sendChannel,
                {...message, id: messageId},
                { destination: this.destination }
            );
        });
    }
}
