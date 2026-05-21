import { useEffect, useState, useCallback } from "react";
import { api } from "../../services/api-client";
import { useConversationsStore } from "../../stores/conversations";
import { ConversationItem } from "./conversation-item";
import { AgentPicker } from "./agent-picker";
import { SearchBar } from "./search-bar";
import { ConversationMenu } from "./conversation-menu";
import type { ConversationWithDetails } from "@argo/shared";

export function ConversationList() {
  const { conversations, setConversations, activeConversationId, setActiveConversation } =
    useConversationsStore();
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
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
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-300">Conversations</h2>
        <button
          onClick={() => setShowAgentPicker(true)}
          className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
        >
          + New
        </button>
      </div>
      <SearchBar onSearch={handleSearch} />
      <div className="flex-1 overflow-y-auto p-2">
        {conversations.map((conv) => (
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
        {conversations.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-zinc-500">
            No conversations found.
          </p>
        )}
      </div>
      {showAgentPicker && (
        <AgentPicker onSelect={handleCreateConversation} onClose={() => setShowAgentPicker(false)} />
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
