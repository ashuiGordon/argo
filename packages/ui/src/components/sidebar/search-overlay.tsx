import { useState, useEffect, useRef, useCallback } from "react";
import { useConversationsStore } from "../../stores/conversations";
import { getAgentLogo } from "../../lib/agent-logos";
import type { ConversationWithDetails } from "@argo/shared";

interface SearchOverlayProps {
  onClose: () => void;
}

export function SearchOverlay({ onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const conversations = useConversationsStore((s) => s.conversations);
  const setActiveConversation = useConversationsStore((s) => s.setActiveConversation);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const filtered = query.trim()
    ? conversations.filter((c) =>
        c.title.toLowerCase().includes(query.toLowerCase()) ||
        c.agents.some((a) => a.name.toLowerCase().includes(query.toLowerCase()))
      )
    : conversations;

  const handleSelect = useCallback((id: string) => {
    setActiveConversation(id);
    onClose();
  }, [setActiveConversation, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-[var(--radius-lg)] border border-gray-200 bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="border-b border-gray-100 px-4 py-3">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats"
            className="w-full bg-transparent text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none"
          />
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto py-2">
          <div className="px-4 py-1.5">
            <span className="text-[11px] font-medium text-gray-400">
              {query.trim() ? "Results" : "Recent chats"}
            </span>
          </div>

          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-[13px] text-gray-400">
              No conversations found
            </div>
          )}

          {filtered.map((conv, idx) => (
            <SearchResultItem
              key={conv.id}
              conversation={conv}
              index={idx + 1}
              onSelect={() => handleSelect(conv.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SearchResultItem({
  conversation,
  index,
  onSelect,
}: {
  conversation: ConversationWithDetails;
  index: number;
  onSelect: () => void;
}) {
  const agent = conversation.agents[0];
  const workspaceName = conversation.workspace?.split("/").pop() || "";

  return (
    <button
      onClick={onSelect}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50 cursor-pointer"
    >
      {/* Agent avatar */}
      {(() => {
        const logo = agent ? getAgentLogo(agent.type) : null;
        return logo ? (
          <img src={logo} alt="" className="h-5 w-5 rounded-full shrink-0" />
        ) : agent ? (
          <div
            className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white shrink-0"
            style={{ backgroundColor: agent.avatarColor }}
          >
            {agent.name[0]}
          </div>
        ) : (
          <div className="h-5 w-5 rounded-full bg-gray-200 shrink-0" />
        );
      })()}

      {/* Title */}
      <span className="flex-1 truncate text-[14px] text-gray-900">
        {conversation.title}
      </span>

      {/* Workspace badge */}
      {workspaceName && (
        <span className="shrink-0 text-[12px] text-gray-400">
          {workspaceName}
        </span>
      )}

      {/* Keyboard shortcut hint */}
      {index <= 9 && (
        <kbd className="ml-2 shrink-0 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-mono text-gray-400">
          {index}
        </kbd>
      )}
    </button>
  );
}
