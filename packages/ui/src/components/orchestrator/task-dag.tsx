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
    <div className="mx-6 mt-4 animate-fade-in rounded-[var(--radius-md)] border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-display text-[14px] font-500 tracking-[-0.2px] text-gray-900">
          Task Execution Plan
        </h3>
        <span className="text-[11px] font-mono text-gray-500">
          {completed}/{total}
        </span>
      </div>
      <div className="mb-3 h-[3px] w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-gray-900 transition-all duration-500"
          style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
        />
      </div>
      <div>
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
