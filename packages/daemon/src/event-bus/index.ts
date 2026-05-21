import { EventEmitter } from "node:events";
import type { NormalizedEvent } from "@argo/shared";

export interface EventBusEvents {
  event: [event: NormalizedEvent, sequenceNumber: number, conversationId: string];
  "session:start": [sessionId: string, conversationId: string];
  "session:end": [sessionId: string, exitCode: number];
  "approval:request": [approvalId: string, sessionId: string];
  "approval:resolved": [approvalId: string, decision: string];
}

export class EventBus extends EventEmitter {
  emit<K extends keyof EventBusEvents>(event: K, ...args: EventBusEvents[K]): boolean {
    return super.emit(event, ...args);
  }

  on<K extends keyof EventBusEvents>(event: K, listener: (...args: EventBusEvents[K]) => void): this {
    return super.on(event, listener as (...args: unknown[]) => void);
  }

  once<K extends keyof EventBusEvents>(event: K, listener: (...args: EventBusEvents[K]) => void): this {
    return super.once(event, listener as (...args: unknown[]) => void);
  }

  off<K extends keyof EventBusEvents>(event: K, listener: (...args: EventBusEvents[K]) => void): this {
    return super.off(event, listener as (...args: unknown[]) => void);
  }
}

export const eventBus = new EventBus();
