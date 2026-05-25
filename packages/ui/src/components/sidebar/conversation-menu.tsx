import { useRef, useEffect } from "react";
import { api } from "../../services/api-client";

interface ConversationMenuProps {
  conversationId: string;
  pinned: boolean;
  archived: boolean;
  onAction: () => void;
  position: { x: number; y: number };
  onClose: () => void;
}

export function ConversationMenu({ conversationId, pinned, archived, onAction, position, onClose }: ConversationMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  async function handlePin() {
    await api.conversations.update(conversationId, { pinned: !pinned });
    onAction();
    onClose();
  }

  async function handleArchive() {
    await api.conversations.update(conversationId, { archived: !archived });
    onAction();
    onClose();
  }

  async function handleDelete() {
    if (confirm("Delete this conversation?")) {
      await api.conversations.delete(conversationId);
      onAction();
      onClose();
    }
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-40 rounded-[var(--radius-sm)] border border-gray-200 bg-white py-1 shadow-lg"
      style={{ top: position.y, left: position.x }}
    >
      <button onClick={handlePin} className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
        {pinned ? "Unpin" : "Pin"}
      </button>
      <button onClick={handleArchive} className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
        {archived ? "Unarchive" : "Archive"}
      </button>
      <button onClick={handleDelete} className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-gray-100 cursor-pointer">
        Delete
      </button>
    </div>
  );
}
