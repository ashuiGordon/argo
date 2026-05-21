import type { NormalizedEvent } from "@argo/shared";
import type { Queries } from "../db/queries.js";
import { eventBus } from "./index.js";

export class EventPersistence {
  constructor(private queries: Queries) {}

  persist(event: NormalizedEvent, conversationId: string): number {
    const sequenceNumber = this.queries.appendEvent(
      event.sessionId,
      conversationId,
      event.type,
      JSON.stringify(event),
    );
    eventBus.emit("event", event, sequenceNumber, conversationId);

    if (event.type === "session_start") {
      eventBus.emit("session:start", event.sessionId, conversationId);
    } else if (event.type === "session_end") {
      eventBus.emit("session:end", event.sessionId, event.exitCode);
    } else if (event.type === "approval_request") {
      eventBus.emit("approval:request", event.approvalId, event.sessionId);
    } else if (event.type === "approval_resolved") {
      eventBus.emit("approval:resolved", event.approvalId, event.decision);
    }

    return sequenceNumber;
  }
}
