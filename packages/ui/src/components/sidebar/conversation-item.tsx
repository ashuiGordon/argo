interface ConversationItemProps {
  id: string;
  title: string;
  lastMessage?: string;
  updatedAt: string;
  pinned: boolean;
  unreadCount: number;
  active: boolean;
  isExternal?: boolean;
  agents: Array<{ name: string; avatarColor: string }>;
  onClick: () => void;
}

export function ConversationItem({
  title,
  updatedAt,
  pinned,
  unreadCount,
  active,
  isExternal,
  agents,
  onClick,
}: ConversationItemProps) {
  const agent = agents[0];
  const timeStr = new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-left transition-colors cursor-pointer ${
        active
          ? "bg-white/[0.08]"
          : "hover:bg-white/[0.04]"
      } ${isExternal ? "border border-dashed border-white/[0.12]" : ""}`}
    >
      {agent ? (
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-600 text-white"
          style={{ backgroundColor: agent.avatarColor }}
        >
          {agent.name[0]}
        </div>
      ) : isExternal ? (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-white/[0.2] text-[11px] text-[#93939f]">
          E
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[13px] font-500 text-white">
            {pinned && <span className="text-[#ff7759] mr-1">●</span>}
            {title}
          </span>
          <span className="shrink-0 text-[11px] text-[#75758a]">{timeStr}</span>
        </div>
        {isExternal && (
          <span className="text-[11px] font-mono uppercase tracking-[0.2px] text-[#ff7759]">External</span>
        )}
      </div>
      {unreadCount > 0 && (
        <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#1863dc] px-1 text-[10px] font-600 text-white">
          {unreadCount}
        </span>
      )}
    </button>
  );
}
