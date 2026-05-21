import { writeToPty, resizePty } from "../providers/pty-manager.js";
import type { ClientMessage } from "@argo/shared";

export function handlePtyInput(msg: ClientMessage & { type: "pty_input" }): void {
  writeToPty(msg.sessionId, msg.data);
}

export function handlePtyResize(sessionId: string, cols: number, rows: number): void {
  resizePty(sessionId, cols, rows);
}
