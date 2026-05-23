import { useEffect, useState, useCallback } from "react";
import { api } from "../../services/api-client";
import { useConversationsStore } from "../../stores/conversations";
import { ConversationItem } from "./conversation-item";
import { AgentPicker } from "./agent-picker";
import { GroupChatCreator } from "./group-chat-creator";
import { SearchBar } from "./search-bar";
import { ConversationMenu } from "./conversation-menu";
import type { ConversationWithDetails } from "@argo/shared";

export function ConversationList() {
  const { conversations, setConversations, activeConversationId, setActiveConversation } =
    useConversationsStore();
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [showGroupCreator, setShowGroupCreator] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showExternal, setShowExternal] = useState(false);
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

  function handleSearch(term: string) {
    setSearchTerm(term);
    loadConversations(term);
  }

  async function handleCreateConversation(agentId: string) {
    setShowAgentPicker(false);
    const res = await api.conversations.create("single", [agentId]);
    await loadConversations(searchTerm);
    setActiveConversation(res.id);
  }

  async function handleCreateGroupChat(agentIds: string[]) {
    setShowGroupCreator(false);
    const res = await api.conversations.create("group", agentIds);
    await loadConversations(searchTerm);
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

  const userConversations = conversations.filter((c) => !c.isExternal);
  const externalConversations = conversations.filter((c) => c.isExternal);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <h2 className="font-display text-[15px] font-500 tracking-[-0.2px] text-white">
          Conversations
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowGroupCreator(true)}
            className="rounded-[var(--radius-pill)] border border-white/[0.15] px-3 py-1 text-[12px] font-500 text-[#93939f] transition-colors hover:border-white/[0.3] hover:text-white cursor-pointer"
          >
            Group
          </button>
          <button
            onClick={() => setShowAgentPicker(true)}
            className="rounded-[var(--radius-pill)] bg-white px-3 py-1 text-[12px] font-500 text-[#17171c] transition-opacity hover:opacity-90 cursor-pointer"
          >
            + New
          </button>
        </div>
      </div>

      <div className="px-4 pb-2">
        <SearchBar onSearch={handleSearch} />
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2">
        {userConversations.map((conv) => (
          <div key={conv.id} onContextMenu={(e) => handleContextMenu(e, conv)}>
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
            />
          </div>
        ))}

        {externalConversations.length > 0 && (
          <>
            <button
              onClick={() => setShowExternal(!showExternal)}
              className="mt-4 flex w-full items-center gap-2 px-3 py-2 text-[12px] font-mono uppercase tracking-[0.28px] text-[#93939f] hover:text-white transition-colors cursor-pointer"
            >
              <span className={`inline-block transition-transform ${showExternal ? "rotate-90" : ""}`}>▸</span>
              External Sessions ({externalConversations.length})
            </button>
            {showExternal && externalConversations.map((conv) => (
              <div key={conv.id} onContextMenu={(e) => handleContextMenu(e, conv)}>
                <ConversationItem
                  id={conv.id}
                  title={conv.title}
                  updatedAt={conv.updatedAt}
                  pinned={conv.pinned}
                  unreadCount={conv.unreadCount}
                  active={conv.id === activeConversationId}
                  isExternal
                  agents={conv.agents}
                  onClick={() => setActiveConversation(conv.id)}
                />
              </div>
            ))}
          </>
        )}

        {conversations.length === 0 && (
          <p className="px-3 py-8 text-center text-[13px] text-[#93939f]">
            No conversations yet
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
          onAction={() => loadConversations(searchTerm)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
