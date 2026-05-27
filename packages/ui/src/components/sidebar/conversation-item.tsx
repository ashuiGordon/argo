import { AgentAvatarGroup } from "../shared/agent-avatar-group";

interface ConversationItemProps {
  id: string;
  title: string;
  lastMessage?: string;
  updatedAt: string;
  pinned: boolean;
  unreadCount: number;
  active: boolean;
  agents: Array<{ name: string; type: string; avatarColor: string; avatarUrl?: string; role?: string }>;
  onClick: () => void;
}

export function ConversationItem({
  title,
  updatedAt,
  pinned,
  unreadCount,
  active,
  agents,
  onClick,
}: ConversationItemProps) {
  const timeStr = new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-left transition-colors cursor-pointer ${
        active
          ? "bg-gray-100"
          : "hover:bg-gray-100/60"
      }`}
    >
      <AgentAvatarGroup agents={agents} size={32} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[13px] font-500 text-gray-900">
            {pinned && <span className="text-orange-500 mr-1">●</span>}
            {title}
          </span>
          <span className="shrink-0 text-[11px] text-gray-400">{timeStr}</span>
        </div>
      </div>
      {unreadCount > 0 && (
        <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-600 text-white">
          {unreadCount}
        </span>
      )}
    </button>
  );
}
