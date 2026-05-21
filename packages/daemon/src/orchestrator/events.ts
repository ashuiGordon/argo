import type { NormalizedEvent, TaskStatus } from "@argo/shared";
import { EventPersistence } from "../event-bus/persist.js";
import { getQueries } from "../db/init.js";

export class OrchestratorEvents {
  private persistence: EventPersistence;

  constructor() {
    this.persistence = new EventPersistence(getQueries());
  }

  emitTaskStatus(
    conversationId: string,
    sessionId: string,
    taskId: string,
    status: TaskStatus,
    title: string,
    assignee: string,
    result?: string,
  ): void {
    const event: NormalizedEvent = {
      type: "task_status",
      sessionId,
      taskId,
      status,
      title,
      assignee,
      result: result ? { output: result } : undefined,
    };
    this.persistence.persist(event, conversationId);
  }

  emitPlanProposed(
    conversationId: string,
    sessionId: string,
    tasks: Array<{ title: string; assignee: string }>,
  ): void {
    const event: NormalizedEvent = {
      type: "message",
      sessionId,
      role: "assistant",
      content: JSON.stringify({ orchestratorPlan: tasks }),
      streaming: false,
      final: false,
    };
    this.persistence.persist(event, conversationId);
  }

  emitSummary(conversationId: string, sessionId: string, summary: string): void {
    const event: NormalizedEvent = {
      type: "message",
      sessionId,
      role: "assistant",
      content: summary,
      streaming: false,
      final: true,
    };
    this.persistence.persist(event, conversationId);
  }

  emitError(conversationId: string, sessionId: string, message: string): void {
    const event: NormalizedEvent = {
      type: "error",
      sessionId,
      message,
      code: "ORCHESTRATOR_ERROR",
      recoverable: true,
    };
    this.persistence.persist(event, conversationId);
  }
}

let orchestratorEvents: OrchestratorEvents | null = null;
export function getOrchestratorEvents(): OrchestratorEvents {
  if (!orchestratorEvents) orchestratorEvents = new OrchestratorEvents();
  return orchestratorEvents;
}
