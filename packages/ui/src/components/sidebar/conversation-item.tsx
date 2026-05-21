interface ConversationItemProps {
  id: string;
  title: string;
  lastMessage?: string;
  updatedAt: string;
  pinned: boolean;
  unreadCount: number;
  active: boolean;
  agents: Array<{ name: string; avatarColor: string }>;
  onClick: () => void;
}

export function ConversationItem({
  title,
  lastMessage,
  updatedAt,
  pinned,
  unreadCount,
  active,
  agents,
  onClick,
}: ConversationItemProps) {
  const agent = agents[0];
  const timeStr = new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
        active ? "bg-zinc-700/50" : "hover:bg-zinc-800/50"
      }`}
    >
      {agent && (
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: agent.avatarColor }}
        >
          {agent.name[0]}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="truncate text-sm font-medium text-white">
            {pinned && "📌 "}{title}
          </span>
          <span className="ml-2 shrink-0 text-xs text-zinc-500">{timeStr}</span>
        </div>
        {lastMessage && (
          <p className="truncate text-xs text-zinc-400">{lastMessage}</p>
        )}
      </div>
      {unreadCount > 0 && (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
          {unreadCount}
        </span>
      )}
    </button>
  );
}
