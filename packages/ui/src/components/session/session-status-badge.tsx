import { useSessionsStore } from "../../stores/sessions";

interface SessionStatusBadgeProps {
  sessionId: string;
}

const STATUS_STYLES = {
  starting: "bg-amber-100 text-amber-700",
  running: "bg-green-100 text-green-700",
  stopped: "bg-gray-100 text-gray-600",
  crashed: "bg-red-100 text-red-700",
} as const;

const STATUS_DOT = {
  starting: "bg-amber-500 animate-pulse",
  running: "bg-green-500",
  stopped: "bg-gray-400",
  crashed: "bg-red-500",
} as const;

export function SessionStatusBadge({ sessionId }: SessionStatusBadgeProps) {
  const session = useSessionsStore((s) => s.sessions.get(sessionId));

  if (!session) return null;

  const style = STATUS_STYLES[session.status] || STATUS_STYLES.stopped;
  const dotStyle = STATUS_DOT[session.status] || STATUS_DOT.stopped;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${style}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotStyle}`} />
      {session.status}
    </span>
  );
}
