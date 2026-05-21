import type { TaskStatus } from "@argo/shared";

export interface OrchestratorTask {
  id: string;
  title: string;
  description: string;
  assignee: string;
  dependsOn: string[];
  status: TaskStatus;
  result?: { output?: string; tokensUsed?: number };
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export class TaskQueue {
  private tasks = new Map<string, OrchestratorTask>();

  add(task: OrchestratorTask): void {
    this.tasks.set(task.id, task);
  }

  get(id: string): OrchestratorTask | undefined {
    return this.tasks.get(id);
  }

  getAll(): OrchestratorTask[] {
    return Array.from(this.tasks.values());
  }

  getByStatus(status: TaskStatus): OrchestratorTask[] {
    return this.getAll().filter((t) => t.status === status);
  }

  getReady(): OrchestratorTask[] {
    return this.getAll().filter((task) => {
      if (task.status !== "pending") return false;
      return task.dependsOn.every((depId) => {
        const dep = this.tasks.get(depId);
        return dep?.status === "completed";
      });
    });
  }

  complete(id: string, result?: { output?: string; tokensUsed?: number }): void {
    const task = this.tasks.get(id);
    if (task) {
      task.status = "completed";
      task.result = result;
    }
  }

  fail(id: string, error: string): void {
    const task = this.tasks.get(id);
    if (!task) return;

    if (task.retryCount < task.maxRetries) {
      task.retryCount++;
      task.status = "pending";
      task.error = error;
    } else {
      task.status = "failed";
      task.error = error;
      this.cascadeFailure(id);
    }
  }

  skip(id: string): void {
    const task = this.tasks.get(id);
    if (task) {
      task.status = "skipped";
    }
  }

  start(id: string): void {
    const task = this.tasks.get(id);
    if (task) {
      task.status = "in_progress";
    }
  }

  isComplete(): boolean {
    return this.getAll().every((t) =>
      t.status === "completed" || t.status === "failed" || t.status === "skipped",
    );
  }

  private cascadeFailure(failedId: string): void {
    for (const task of this.tasks.values()) {
      if (task.status === "pending" && task.dependsOn.includes(failedId)) {
        task.status = "blocked";
        this.cascadeFailure(task.id);
      }
    }
  }
}
