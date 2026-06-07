import { useEffect, useState, useCallback } from "react";
import { api } from "../../services/api-client";
import { useConversationsStore } from "../../stores/conversations";
import { ConversationItem } from "./conversation-item";
import { AgentAvatarGroup } from "../shared/agent-avatar-group";
import { AgentPicker } from "./agent-picker";
import { GroupChatCreator } from "./group-chat-creator";
import { ConversationMenu } from "./conversation-menu";
import { SearchOverlay } from "./search-overlay";
import type { ConversationWithDetails } from "@argo/shared";

interface ConversationListProps {
  collapsed?: boolean;
  onShowAgentsTools?: () => void;
  onNewChat?: () => void;
}

export function ConversationList({ collapsed, onShowAgentsTools, onNewChat }: ConversationListProps) {
  const { conversations, setConversations, activeConversationId, setActiveConversation } =
    useConversationsStore();
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [showGroupCreator, setShowGroupCreator] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    id: string;
    pinned: boolean;
    archived: boolean;
    position: { x: number; y: number };
  } | null>(null);

  const loadConversations = useCallback(async (search?: string) => {
    const res = await api.conversations.list(1, 50, search || undefined);
    setConversations(res.conversations as ConversationWithDetails[]);
  }, [setConversations]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  async function handleCreateConversation(agentId: string, workspace: string) {
    setShowAgentPicker(false);
    const res = await api.conversations.create("single", [agentId], undefined, workspace);
    await loadConversations();
    setActiveConversation(res.id);
  }

  async function handleCreateGroupChat(agentIds: string[]) {
    setShowGroupCreator(false);
    const res = await api.conversations.create("group", agentIds);
    await loadConversations();
    setActiveConversation(res.id);
  }

  function handleContextMenu(e: React.MouseEvent, conv: ConversationWithDetails) {
    e.preventDefault();
    setContextMenu({
      id: conv.id,
      pinned: conv.pinned,
      archived: conv.archived,
      position: { x: e.clientX, y: e.clientY },
    });
  }

  return (
    <div className="flex h-full flex-col">
      {/* Navigation items */}
      <div className={`pt-4 pb-2 space-y-0.5 ${collapsed ? "px-2" : "px-3"}`}>
        {/* Search */}
        <button
          onClick={() => setShowSearch(!showSearch)}
          className={`flex w-full items-center rounded-[var(--radius-sm)] py-2 text-[13px] text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 cursor-pointer ${collapsed ? "justify-center px-0" : "gap-2.5 px-3"}`}
          title="搜索"
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          {!collapsed && <span>搜索</span>}
        </button>

        {/* New Chat */}
        <button
          onClick={() => {
            setActiveConversation(null);
            onNewChat?.();
          }}
          className={`flex w-full items-center rounded-[var(--radius-sm)] py-2 text-[13px] text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 cursor-pointer ${collapsed ? "justify-center px-0" : "gap-2.5 px-3"}`}
          title="新对话"
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
          {!collapsed && <span>新对话</span>}
        </button>

        {/* Agents / Tool Config */}
        <button
          onClick={() => onShowAgentsTools?.()}
          className={`flex w-full items-center rounded-[var(--radius-sm)] py-2 text-[13px] text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 cursor-pointer ${collapsed ? "justify-center px-0" : "gap-2.5 px-3"}`}
          title="智能体 & 工具"
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.25 3.03a.75.75 0 01-1.08-.79l1-5.85-4.25-4.14a.75.75 0 01.42-1.28l5.87-.86 2.63-5.32a.75.75 0 011.34 0l2.63 5.32 5.87.86a.75.75 0 01.42 1.28l-4.25 4.14 1 5.85a.75.75 0 01-1.08.79l-5.25-3.03z" />
          </svg>
          {!collapsed && <span>智能体 & 工具</span>}
        </button>
      </div>

      {/* Chats section header */}
      {!collapsed && (
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
            对话
          </span>
        </div>
      )}

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2">
        {conversations.map((conv) => (
          <div key={conv.id} onContextMenu={(e) => handleContextMenu(e, conv)}>
            {collapsed ? (
              <button
                onClick={() => setActiveConversation(conv.id)}
                className={`flex w-full items-center justify-center rounded-[var(--radius-sm)] py-2 my-0.5 cursor-pointer transition-colors ${
                  conv.id === activeConversationId ? "bg-gray-100" : "hover:bg-gray-100/60"
                }`}
                title={conv.title}
              >
                <AgentAvatarGroup agents={conv.agents} size={28} />
              </button>
            ) : (
              <ConversationItem
                id={conv.id}
                title={conv.title}
                lastMessage={conv.lastMessage?.content}
                updatedAt={conv.updatedAt}
                pinned={conv.pinned}
                unreadCount={conv.unreadCount}
                active={conv.id === activeConversationId}
                agents={conv.agents}
                onClick={() => setActiveConversation(conv.id)}
                onMenuClick={(e) => handleContextMenu(e as unknown as React.MouseEvent<HTMLDivElement>, conv)}
              />
            )}
          </div>
        ))}

        {conversations.length === 0 && (
          <p className="px-3 py-8 text-center text-[13px] text-gray-400">
            暂无对话
          </p>
        )}
      </div>

      {showAgentPicker && (
        <AgentPicker onSelect={handleCreateConversation} onClose={() => setShowAgentPicker(false)} />
      )}
      {showGroupCreator && (
        <GroupChatCreator onCreate={handleCreateGroupChat} onClose={() => setShowGroupCreator(false)} />
      )}
      {contextMenu && (
        <ConversationMenu
          conversationId={contextMenu.id}
          pinned={contextMenu.pinned}
          archived={contextMenu.archived}
          position={contextMenu.position}
          onAction={() => loadConversations()}
          onClose={() => setContextMenu(null)}
        />
      )}
      {showSearch && (
        <SearchOverlay onClose={() => setShowSearch(false)} />
      )}
    </div>
  );
}
