interface PlanApprovalProps {
  tasks: Array<{ title: string; assignee: string }>;
  onApprove: () => void;
  onReject: () => void;
}

export function PlanApproval({ tasks, onApprove, onReject }: PlanApprovalProps) {
  return (
    <div className="mb-4 rounded-[var(--radius-md)] border border-blue-200 bg-blue-50 p-4">
      <h3 className="mb-2 text-sm font-semibold text-blue-800">Execution Plan</h3>
      <p className="mb-3 text-xs text-gray-600">
        The orchestrator proposes the following task decomposition:
      </p>
      <div className="mb-3 space-y-1">
        {tasks.map((task, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
            <span className="text-xs text-gray-400">{i + 1}.</span>
            <span>{task.title}</span>
            <span className="text-xs text-gray-500">→ {task.assignee}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onApprove}
          className="rounded-[var(--radius-sm)] bg-gray-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-gray-800 cursor-pointer"
        >
          Approve & Execute
        </button>
        <button
          onClick={onReject}
          className="rounded-[var(--radius-sm)] border border-gray-300 px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
