interface PlanApprovalProps {
  tasks: Array<{ title: string; assignee: string }>;
  onApprove: () => void;
  onReject: () => void;
}

export function PlanApproval({ tasks, onApprove, onReject }: PlanApprovalProps) {
  return (
    <div className="mb-4 rounded-lg border border-blue-700/50 bg-blue-950/20 p-4">
      <h3 className="mb-2 text-sm font-semibold text-blue-200">Execution Plan</h3>
      <p className="mb-3 text-xs text-zinc-400">
        The orchestrator proposes the following task decomposition:
      </p>
      <div className="mb-3 space-y-1">
        {tasks.map((task, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-zinc-300">
            <span className="text-xs text-zinc-500">{i + 1}.</span>
            <span>{task.title}</span>
            <span className="text-xs text-zinc-500">→ {task.assignee}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onApprove}
          className="rounded bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          Approve & Execute
        </button>
        <button
          onClick={onReject}
          className="rounded bg-zinc-700 px-4 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-600"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
