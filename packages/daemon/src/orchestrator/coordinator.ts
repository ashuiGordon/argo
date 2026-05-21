import { randomUUID } from "node:crypto";
import { TaskQueue, type OrchestratorTask } from "./task-queue.js";
import { Scheduler, type TaskExecutor } from "./scheduler.js";
import { resolveDependencies, type RawTask } from "./dependency-resolver.js";
import { synthesizeResults } from "./synthesizer.js";
import { shouldOrchestrate } from "./router.js";
import { EventPersistence } from "../event-bus/persist.js";
import { getQueries } from "../db/init.js";
import type { NormalizedEvent } from "@argo/shared";

export interface DecomposedPlan {
  tasks: RawTask[];
}

export class Coordinator {
  private persistence: EventPersistence;

  constructor() {
    this.persistence = new EventPersistence(getQueries());
  }

  shouldOrchestrate(message: string): boolean {
    return shouldOrchestrate(message);
  }

  async execute(
    conversationId: string,
    sessionId: string,
    plan: DecomposedPlan,
    executor: TaskExecutor,
  ): Promise<string> {
    const idMap = new Map<string, string>();
    for (const task of plan.tasks) {
      idMap.set(task.title, randomUUID());
    }

    const tasks = resolveDependencies(plan.tasks, idMap);
    const queue = new TaskQueue();
    for (const task of tasks) {
      queue.add(task);
    }

    const scheduler = new Scheduler(queue);

    await scheduler.run(executor, (task: OrchestratorTask) => {
      const event: NormalizedEvent = {
        type: "task_status",
        sessionId,
        taskId: task.id,
        status: task.status,
        title: task.title,
        assignee: task.assignee,
        result: task.result,
      };
      this.persistence.persist(event, conversationId);
    });

    const summary = synthesizeResults(queue.getAll());

    const summaryEvent: NormalizedEvent = {
      type: "message",
      sessionId,
      role: "assistant",
      content: summary,
      streaming: false,
      final: true,
    };
    this.persistence.persist(summaryEvent, conversationId);

    return summary;
  }
}

let coordinator: Coordinator | null = null;
export function getCoordinator(): Coordinator {
  if (!coordinator) coordinator = new Coordinator();
  return coordinator;
}
