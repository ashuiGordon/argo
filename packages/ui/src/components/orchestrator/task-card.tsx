import type { TaskStatus } from "@argo/shared";

interface TaskCardProps {
  id: string;
  title: string;
  assignee: string;
  status: TaskStatus;
  error?: string;
}

const statusConfig: Record<TaskStatus, { label: string; color: string; dot: string }> = {
  pending: { label: "Pending", color: "text-gray-500", dot: "bg-gray-400" },
  blocked: { label: "Blocked", color: "text-red-600", dot: "bg-red-500" },
  in_progress: { label: "Running", color: "text-blue-600", dot: "bg-blue-500 animate-pulse" },
  completed: { label: "Done", color: "text-green-600", dot: "bg-green-500" },
  failed: { label: "Failed", color: "text-red-600", dot: "bg-red-500" },
  skipped: { label: "Skipped", color: "text-gray-400", dot: "bg-gray-300" },
};

export function TaskCard({ title, assignee, status, error }: TaskCardProps) {
  const config = statusConfig[status];

  return (
    <div className="border-b border-gray-100 py-3 last:border-0">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-500 text-gray-900">{title}</span>
        <span className={`flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.2px] ${config.color}`}>
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${config.dot}`} />
          {config.label}
        </span>
      </div>
      <div className="mt-0.5 text-[11px] text-gray-500">{assignee}</div>
      {error && <div className="mt-1 text-[11px] text-red-600">{error}</div>}
    </div>
  );
}
