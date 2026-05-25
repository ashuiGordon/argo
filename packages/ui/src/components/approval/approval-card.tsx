import { api } from "../../services/api-client";

interface ApprovalCardProps {
  approvalId: string;
  toolName: string;
  riskLevel: string;
  action: string;
  proposedAction: Record<string, unknown>;
  onDecided?: () => void;
}

const riskColors: Record<string, { chip: string; border: string }> = {
  critical: { chip: "bg-red-100 text-red-700 border-red-200", border: "border-red-200" },
  high: { chip: "bg-orange-100 text-orange-700 border-orange-200", border: "border-orange-200" },
  medium: { chip: "bg-amber-100 text-amber-700 border-amber-200", border: "border-amber-200" },
  low: { chip: "bg-green-100 text-green-700 border-green-200", border: "border-green-200" },
};

export function ApprovalCard({ approvalId, toolName, riskLevel, action, proposedAction, onDecided }: ApprovalCardProps) {
  const colors = riskColors[riskLevel] || riskColors.medium;

  async function handleDecide(decision: "approve" | "deny") {
    await api.approvals.decide(approvalId, decision);
    onDecided?.();
  }

  return (
    <div className={`mb-4 animate-slide-up rounded-[var(--radius-md)] border ${colors.border} bg-white p-5 shadow-sm`}>
      <div className="mb-3 flex items-center gap-2">
        <span className={`rounded-[var(--radius-pill)] border px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.3px] ${colors.chip}`}>
          {riskLevel}
        </span>
        <span className="text-[13px] font-500 text-gray-900">Approval Required</span>
      </div>
      <div className="mb-3 text-[14px] text-gray-600">
        <span className="font-mono text-red-600">{toolName}</span>
        <span className="mx-2 text-gray-300">—</span>
        {action}
      </div>
      {proposedAction && Object.keys(proposedAction).length > 0 && (
        <pre className="mb-4 overflow-x-auto rounded-[var(--radius-sm)] bg-gray-50 p-3 text-[11px] text-gray-600 font-mono border border-gray-200">
          {JSON.stringify(proposedAction, null, 2).slice(0, 300)}
        </pre>
      )}
      <div className="flex gap-3">
        <button
          onClick={() => handleDecide("approve")}
          className="rounded-[var(--radius-pill)] bg-gray-900 px-5 py-2 text-[12px] font-500 text-white transition-opacity hover:opacity-90 cursor-pointer"
        >
          Approve
        </button>
        <button
          onClick={() => handleDecide("deny")}
          className="rounded-[var(--radius-pill)] border border-gray-300 px-5 py-2 text-[12px] font-500 text-gray-700 transition-colors hover:border-gray-400 hover:text-gray-900 cursor-pointer"
        >
          Deny
        </button>
      </div>
    </div>
  );
}
