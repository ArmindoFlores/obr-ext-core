import type { MessageBase, MessageError } from "./types";

export function isErrorMessage(message: MessageBase): message is MessageError {
    return message.type === "ERROR";
}

export function makeErrorMessage(id: string, message: string): MessageError {
    return { id, type: "ERROR", error: message };
}
