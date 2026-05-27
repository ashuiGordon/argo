import { TokenUsageBar } from "./token-usage-bar";
import { SessionStatusBadge } from "./session-status-badge";
import { HookActivityFeed } from "./hook-activity-feed";
import { useSessionsStore } from "../../stores/sessions";

interface SessionPanelProps {
  sessionId: string;
  onResume?: () => void;
}

export function SessionPanel({ sessionId, onResume }: SessionPanelProps) {
  const session = useSessionsStore((s) => s.sessions.get(sessionId));

  if (!session) return null;

  const canResume = session.status === "stopped" || session.status === "crashed";

  return (
    <div className="flex flex-col border-b border-gray-200 bg-gray-50/50">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-700">
            {session.provider === "claude_code" ? "Claude Code" : "Codex"}
          </span>
          <SessionStatusBadge sessionId={sessionId} />
        </div>
        {canResume && onResume && (
          <button
            onClick={onResume}
            className="rounded px-2 py-0.5 text-[11px] font-medium text-blue-600 hover:bg-blue-50 transition-colors"
          >
            Resume
          </button>
        )}
      </div>
      <TokenUsageBar sessionId={sessionId} />
      <HookActivityFeed sessionId={sessionId} />
    </div>
  );
}
