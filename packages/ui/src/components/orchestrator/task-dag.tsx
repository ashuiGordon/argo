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
    <div className="mx-6 mt-4 animate-fade-in rounded-[var(--radius-md)] border border-white/[0.08] bg-white/[0.02] p-5">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-display text-[14px] font-500 tracking-[-0.2px] text-white">
          Task Execution Plan
        </h3>
        <span className="text-[11px] font-mono text-[#93939f]">
          {completed}/{total}
        </span>
      </div>
      <div className="mb-3 h-[3px] w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-white transition-all duration-500"
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
