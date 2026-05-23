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
  critical: { chip: "bg-red-500/15 text-red-400 border-red-500/25", border: "border-red-900/30" },
  high: { chip: "bg-orange-500/15 text-orange-400 border-orange-500/25", border: "border-orange-900/30" },
  medium: { chip: "bg-[#ff7759]/15 text-[#ff7759] border-[#ff7759]/25", border: "border-[#ff7759]/20" },
  low: { chip: "bg-green-500/15 text-green-400 border-green-500/25", border: "border-green-900/30" },
};

export function ApprovalCard({ approvalId, toolName, riskLevel, action, proposedAction, onDecided }: ApprovalCardProps) {
  const colors = riskColors[riskLevel] || riskColors.medium;

  async function handleDecide(decision: "approve" | "deny") {
    await api.approvals.decide(approvalId, decision);
    onDecided?.();
  }

  return (
    <div className={`mb-4 animate-slide-up rounded-[var(--radius-md)] border ${colors.border} bg-white/[0.02] p-5`}>
      <div className="mb-3 flex items-center gap-2">
        <span className={`rounded-[var(--radius-pill)] border px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.3px] ${colors.chip}`}>
          {riskLevel}
        </span>
        <span className="text-[13px] font-500 text-white">Approval Required</span>
      </div>
      <div className="mb-3 text-[14px] text-[#93939f]">
        <span className="font-mono text-[#ff7759]">{toolName}</span>
        <span className="mx-2 text-white/20">—</span>
        {action}
      </div>
      {proposedAction && Object.keys(proposedAction).length > 0 && (
        <pre className="mb-4 overflow-x-auto rounded-[var(--radius-sm)] bg-[#0f0f13] p-3 text-[11px] text-[#75758a] font-mono border border-white/[0.06]">
          {JSON.stringify(proposedAction, null, 2).slice(0, 300)}
        </pre>
      )}
      <div className="flex gap-3">
        <button
          onClick={() => handleDecide("approve")}
          className="rounded-[var(--radius-pill)] bg-white px-5 py-2 text-[12px] font-500 text-[#17171c] transition-opacity hover:opacity-90 cursor-pointer"
        >
          Approve
        </button>
        <button
          onClick={() => handleDecide("deny")}
          className="rounded-[var(--radius-pill)] border border-white/[0.15] px-5 py-2 text-[12px] font-500 text-[#93939f] transition-colors hover:border-white/[0.3] hover:text-white cursor-pointer"
        >
          Deny
        </button>
      </div>
    </div>
  );
}
