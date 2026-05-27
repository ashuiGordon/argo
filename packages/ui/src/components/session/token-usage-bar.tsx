import { useSessionsStore } from "../../stores/sessions";

interface TokenUsageBarProps {
  sessionId: string;
}

export function TokenUsageBar({ sessionId }: TokenUsageBarProps) {
  const session = useSessionsStore((s) => s.sessions.get(sessionId));

  if (!session?.tokenUsage) return null;

  const { tokenUsage } = session;
  const percent = tokenUsage.contextPercent ?? 0;
  const barColor = percent > 80 ? "bg-red-500" : percent > 60 ? "bg-amber-500" : "bg-blue-500";

  return (
    <div className="flex flex-col gap-1 px-3 py-2 text-xs text-gray-500">
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-700">Context</span>
        <span>{percent.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>{tokenUsage.model || "unknown"}</span>
        <span>{formatTokens(tokenUsage.totalTokens)} tokens</span>
      </div>
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
