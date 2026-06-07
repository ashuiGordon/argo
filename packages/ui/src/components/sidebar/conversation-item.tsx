import { AgentAvatarGroup } from "../shared/agent-avatar-group";
import { MoreVertical, Pin } from "lucide-react";

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
  onMenuClick?: (e: React.MouseEvent) => void;
}

export function ConversationItem({
  title,
  lastMessage,
  pinned,
  unreadCount,
  active,
  agents,
  onClick,
  onMenuClick,
}: ConversationItemProps) {
  return (
    <button
      onClick={onClick}
      className={`group/item flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-left transition-colors cursor-pointer ${
        active
          ? "bg-gray-100"
          : "hover:bg-gray-100/60"
      }`}
    >
      <AgentAvatarGroup agents={agents} size={32} />
      <div className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-500 text-gray-900">
          {title}
        </span>
        {lastMessage && (
          <span className="block truncate text-[11px] text-gray-400 mt-0.5">
            {lastMessage}
          </span>
        )}
      </div>
      {/* Right side: pin icon or menu button */}
      <div className="shrink-0 flex h-6 w-6 items-center justify-center">
        {onMenuClick && (
          <div
            onClick={(e) => { e.stopPropagation(); onMenuClick(e); }}
            className="hidden group-hover/item:flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-gray-200 hover:text-gray-600 cursor-pointer"
          >
            <MoreVertical className="h-4 w-4" />
          </div>
        )}
        {pinned && (
          <Pin className="h-3.5 w-3.5 text-gray-400 group-hover/item:hidden" />
        )}
      </div>
      {unreadCount > 0 && (
        <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-600 text-white">
          {unreadCount}
        </span>
      )}
    </button>
  );
}
