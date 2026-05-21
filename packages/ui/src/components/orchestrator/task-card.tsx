import type { TaskStatus } from "@argo/shared";

interface TaskCardProps {
  id: string;
  title: string;
  assignee: string;
  status: TaskStatus;
  error?: string;
}

const statusConfig: Record<TaskStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: "text-zinc-400" },
  blocked: { label: "Blocked", color: "text-red-400" },
  in_progress: { label: "Running", color: "text-blue-400" },
  completed: { label: "Done", color: "text-green-400" },
  failed: { label: "Failed", color: "text-red-400" },
  skipped: { label: "Skipped", color: "text-zinc-500" },
};

export function TaskCard({ title, assignee, status, error }: TaskCardProps) {
  const config = statusConfig[status];

  return (
    <div className="rounded border border-zinc-700 bg-zinc-800/50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">{title}</span>
        <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
      </div>
      <div className="mt-1 text-xs text-zinc-500">Assigned to: {assignee}</div>
      {error && <div className="mt-1 text-xs text-red-400">{error}</div>}
      {status === "in_progress" && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-zinc-700">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-500" />
        </div>
      )}
    </div>
  );
}
