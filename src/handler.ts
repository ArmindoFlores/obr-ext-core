import OBR from "@owlbear-rodeo/sdk";
import type { AnyRegistry, APIHandlerFunction, MessageBase, MessageError, OBRSendDestination } from "./types";
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
    private $unregister: (() => void) | undefined;

    constructor(sendChannel: string, receiveChannel: string, options?: Partial<APIHandlerOptions>) {
        this.sendChannel = sendChannel;
        this.receiveChannel = receiveChannel;
        this.destination = options?.destination ?? "ALL";
        this.$invalidMessageHandler = options?.invalidMessageHandler;
        this.$unknownMessageHandler = options?.unknownMessageHandler;
    }

    setHandler<T extends keyof MRegistry>(messageType: T, handler: (m: MRegistry[T]["request"]) => Omit<MRegistry[T]["response"] | MessageError, "id">) {
        this.$handlers[messageType] = handler;
    }

    register() {
        if (this.$unregister !== undefined) {
            this.$unregister();
        }

        this.$unregister = OBR.broadcast.onMessage(this.receiveChannel, event => {
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

            let response: MessageBase;
            try {
                response = {
                    ...handler(message),
                    id: message.id,
                };
            }
            catch (error) {
                response = makeErrorMessage(message.id, (error as Error).message);
            }

            OBR.broadcast.sendMessage(this.sendChannel, response, { destination: this.destination });
        });
    }

    unregister() {
        if (this.$unregister === undefined) return;
        this.$unregister();
        this.$unregister = undefined;
    }
}
