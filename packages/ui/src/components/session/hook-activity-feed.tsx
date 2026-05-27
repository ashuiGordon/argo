import { useSessionsStore, type HookActivity } from "../../stores/sessions";

interface HookActivityFeedProps {
  sessionId: string;
}

const HOOK_ICONS: Record<string, string> = {
  PreToolUse: "🔧",
  PostToolUse: "✅",
  PermissionRequest: "🔐",
  PermissionDenied: "🚫",
  SubagentStart: "🤖",
  SubagentStop: "⏹",
  Notification: "💬",
  Elicitation: "❓",
  ElicitationResult: "📝",
  SessionStart: "▶️",
  SessionEnd: "⏸",
  Stop: "🛑",
};

export function HookActivityFeed({ sessionId }: HookActivityFeedProps) {
  const session = useSessionsStore((s) => s.sessions.get(sessionId));

  if (!session || session.hookEvents.length === 0) return null;

  return (
    <div className="flex flex-col gap-0.5 px-3 py-2">
      <span className="mb-1 text-[11px] font-medium text-gray-500 uppercase tracking-wide">Activity</span>
      <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
        {session.hookEvents.slice(-10).reverse().map((activity) => (
          <HookActivityItem key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  );
}

function HookActivityItem({ activity }: { activity: HookActivity }) {
  const icon = HOOK_ICONS[activity.hookType] || "📌";
  const timeStr = new Date(activity.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="flex items-center gap-2 text-xs text-gray-600">
      <span className="text-[10px]">{icon}</span>
      <span className="flex-1 truncate">{activity.summary}</span>
      <span className="text-[10px] text-gray-400 shrink-0">{timeStr}</span>
    </div>
  );
}
