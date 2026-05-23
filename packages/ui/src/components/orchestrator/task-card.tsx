import type { TaskStatus } from "@argo/shared";

interface TaskCardProps {
  id: string;
  title: string;
  assignee: string;
  status: TaskStatus;
  error?: string;
}

const statusConfig: Record<TaskStatus, { label: string; color: string; dot: string }> = {
  pending: { label: "Pending", color: "text-[#93939f]", dot: "bg-[#93939f]" },
  blocked: { label: "Blocked", color: "text-red-400", dot: "bg-red-400" },
  in_progress: { label: "Running", color: "text-[#1863dc]", dot: "bg-[#1863dc] animate-pulse" },
  completed: { label: "Done", color: "text-[#4ade80]", dot: "bg-[#4ade80]" },
  failed: { label: "Failed", color: "text-red-400", dot: "bg-red-400" },
  skipped: { label: "Skipped", color: "text-[#75758a]", dot: "bg-[#75758a]" },
};

export function TaskCard({ title, assignee, status, error }: TaskCardProps) {
  const config = statusConfig[status];

  return (
    <div className="border-b border-white/[0.06] py-3 last:border-0">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-500 text-white">{title}</span>
        <span className={`flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.2px] ${config.color}`}>
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${config.dot}`} />
          {config.label}
        </span>
      </div>
      <div className="mt-0.5 text-[11px] text-[#75758a]">{assignee}</div>
      {error && <div className="mt-1 text-[11px] text-red-400">{error}</div>}
    </div>
  );
}
