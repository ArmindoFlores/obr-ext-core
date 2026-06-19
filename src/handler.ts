import type { APIHandlerFunction, AnyRegistry, MessageBase, MessageError, OBRSendDestination } from "./types";

import OBR from "@owlbear-rodeo/sdk";
import { makeErrorMessage } from "./utils";

export interface APIHandlerOptions {
    destination: OBRSendDestination;
    invalidMessageHandler: (message: unknown) => void;
    unknownMessageHandler: (message: MessageBase) => void;
};

export class APIHandler<MRegistry extends AnyRegistry = never> {
    sendChannel: string;
    receiveChannel: string;
    destination: OBRSendDestination;

    private $invalidMessageHandler: ((message: unknown) => void) | undefined;
    private $unknownMessageHandler: ((message: MessageBase) => void) | undefined;
    private $handlers: Partial<Record<keyof MRegistry, APIHandlerFunction<MRegistry>>> = {};
    private $messageFilters: Partial<Record<keyof MRegistry, (message: MessageBase) => boolean>> = {};
    private $unregister: (() => void) | undefined;

    constructor(sendChannel: string, receiveChannel: string, options?: Partial<APIHandlerOptions>) {
        this.sendChannel = sendChannel;
        this.receiveChannel = receiveChannel;
        this.destination = options?.destination ?? "ALL";
        this.$invalidMessageHandler = options?.invalidMessageHandler;
        this.$unknownMessageHandler = options?.unknownMessageHandler;
    }

    async sendMessage(message: MessageBase) {
        await OBR.broadcast.sendMessage(this.sendChannel, message, { destination: this.destination });
    }

    setHandler<T extends keyof MRegistry>(messageType: T, handler: (this: APIHandler<MRegistry>, m: MRegistry[T]["request"]) => Promise<Omit<MRegistry[T]["response"] | MessageError, "id">>) {
        this.$handlers[messageType] = handler;
    }

    setMessageFilter<T extends keyof MRegistry>(messageType: T, filter: (m: MRegistry[T]["request"]) => boolean) {
        this.$messageFilters[messageType] = filter;
    }

    register() {
        if (this.$unregister !== undefined) {
            this.$unregister();
        }

        this.$unregister = OBR.broadcast.onMessage(this.receiveChannel, async event => {
            const message = event.data as MessageBase;

            if (typeof message.id !== "string") {
                this.$invalidMessageHandler?.(message);
                return;
            }
            
            const handler = this.$handlers[message.type];
            if (handler === undefined) {
                this.$unknownMessageHandler?.(message);
                return;
            }

            const filter = this.$messageFilters[message.type];
            if (filter && !filter(message)) {
                return;
            }

            let response: MessageBase;
            try {
                response = {
                    ...(await handler.call(this, message)),
                    id: message.id,
                };
            }
            catch (error) {
                response = makeErrorMessage(message.id, (error as Error).message);
            }

            this.sendMessage(response);
        });
    }

    unregister() {
        if (this.$unregister === undefined) return;
        this.$unregister();
        this.$unregister = undefined;
    }
}
