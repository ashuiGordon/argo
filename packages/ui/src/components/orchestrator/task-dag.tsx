import { TaskCard } from "./task-card";
import type { TaskStatus } from "@argo/shared";

interface TaskNode {
  id: string;
  title: string;
  assignee: string;
  status: TaskStatus;
  dependsOn: string[];
  error?: string;
}

interface TaskDagProps {
  tasks: TaskNode[];
}

export function TaskDag({ tasks }: TaskDagProps) {
  if (tasks.length === 0) return null;

  const completed = tasks.filter((t) => t.status === "completed").length;
  const total = tasks.length;

  return (
    <div className="mb-4 rounded-lg border border-zinc-700 bg-zinc-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Task Execution Plan</h3>
        <span className="text-xs text-zinc-400">
          {completed}/{total} complete
        </span>
      </div>
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            id={task.id}
            title={task.title}
            assignee={task.assignee}
            status={task.status}
            error={task.error}
          />
        ))}
      </div>
    </div>
  );
}
