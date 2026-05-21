import { TaskQueue, type OrchestratorTask } from "./task-queue.js";
import { Semaphore } from "./semaphore.js";
import { MAX_PARALLEL_TASKS } from "@argo/shared";

export type TaskExecutor = (task: OrchestratorTask) => Promise<{ output?: string; tokensUsed?: number }>;

export class Scheduler {
  private semaphore: Semaphore;
  private taskQueue: TaskQueue;

  constructor(taskQueue: TaskQueue, maxParallel: number = MAX_PARALLEL_TASKS) {
    this.taskQueue = taskQueue;
    this.semaphore = new Semaphore(maxParallel);
  }

  async run(executor: TaskExecutor, onTaskUpdate: (task: OrchestratorTask) => void): Promise<void> {
    while (!this.taskQueue.isComplete()) {
      const ready = this.taskQueue.getReady();
      if (ready.length === 0) {
        const inProgress = this.taskQueue.getByStatus("in_progress");
        if (inProgress.length === 0) break;
        await new Promise((r) => setTimeout(r, 100));
        continue;
      }

      const batch = ready.map(async (task) => {
        await this.semaphore.acquire();
        try {
          this.taskQueue.start(task.id);
          onTaskUpdate(this.taskQueue.get(task.id)!);

          const result = await executor(task);
          this.taskQueue.complete(task.id, result);
          onTaskUpdate(this.taskQueue.get(task.id)!);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.taskQueue.fail(task.id, message);
          onTaskUpdate(this.taskQueue.get(task.id)!);
        } finally {
          this.semaphore.release();
        }
      });

      await Promise.all(batch);
    }
  }
}
