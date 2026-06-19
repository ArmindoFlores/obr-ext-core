import type { APIHandler } from "./handler";
import type { NoResponse } from "./utils";

export interface MessageBase {
    id: string;
    type: string;
}

export interface MessageError extends MessageBase {
    type: "ERROR";
    error: string;
}

export type AnyRegistry = Record<string, { request: MessageBase; response: MessageBase }>;

export type APIHandlerFunction<MRegistry extends AnyRegistry> = {
    [T in keyof MRegistry]: (
        this: APIHandler<MRegistry>,
        message: MRegistry[T]["request"]
    ) => Promise<Omit<MRegistry[T]["response"], "id"> | Omit<MessageError, "id"> | NoResponseType>;
}[keyof MRegistry];

export type OBRSendDestination = "ALL" | "REMOTE" | "LOCAL";

export type OptionalKeys<T extends object, K extends keyof T> = Omit<T, K> & Partial<T>;

export type NoResponseType = typeof NoResponse;
