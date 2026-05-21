import { api } from "../../services/api-client";

interface ApprovalCardProps {
  approvalId: string;
  toolName: string;
  riskLevel: string;
  action: string;
  proposedAction: Record<string, unknown>;
  onDecided?: () => void;
}

const riskColors: Record<string, string> = {
  critical: "bg-red-600",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

export function ApprovalCard({ approvalId, toolName, riskLevel, action, proposedAction, onDecided }: ApprovalCardProps) {
  async function handleDecide(decision: "approve" | "deny") {
    await api.approvals.decide(approvalId, decision);
    onDecided?.();
  }

  return (
    <div className="mb-3 rounded-lg border border-amber-700/50 bg-amber-950/30 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className={`rounded px-1.5 py-0.5 text-xs font-bold uppercase text-white ${riskColors[riskLevel] || "bg-zinc-600"}`}>
          {riskLevel}
        </span>
        <span className="text-sm font-medium text-amber-200">Approval Required</span>
      </div>
      <div className="mb-2 text-sm text-zinc-300">
        <span className="font-mono text-amber-400">{toolName}</span>: {action}
      </div>
      {proposedAction && Object.keys(proposedAction).length > 0 && (
        <pre className="mb-3 overflow-x-auto rounded bg-zinc-900 p-2 text-xs text-zinc-400">
          {JSON.stringify(proposedAction, null, 2).slice(0, 300)}
        </pre>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => handleDecide("approve")}
          className="rounded bg-green-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-green-700"
        >
          Approve
        </button>
        <button
          onClick={() => handleDecide("deny")}
          className="rounded bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700"
        >
          Deny
        </button>
      </div>
    </div>
  );
}
