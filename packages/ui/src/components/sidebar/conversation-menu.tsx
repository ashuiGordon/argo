import { useRef, useEffect, useState } from "react";
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
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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

  async function handleDeleteConfirm() {
    onClose();
    await api.conversations.delete(conversationId);
    onAction();
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-40 rounded-[var(--radius-sm)] border border-gray-200 bg-white py-1 shadow-lg"
      style={{ top: position.y, left: position.x }}
    >
      {confirmingDelete ? (
        <div className="px-3 py-1.5">
          <p className="text-[12px] text-gray-600 mb-2">Delete?</p>
          <div className="flex gap-2">
            <button onClick={handleDeleteConfirm} className="text-[12px] font-500 text-red-600 hover:text-red-800 cursor-pointer">
              Yes
            </button>
            <button onClick={() => setConfirmingDelete(false)} className="text-[12px] font-500 text-gray-500 hover:text-gray-700 cursor-pointer">
              No
            </button>
          </div>
        </div>
      ) : (
        <>
          <button onClick={handlePin} className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
            {pinned ? "Unpin" : "Pin"}
          </button>
          <button onClick={handleArchive} className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
            {archived ? "Unarchive" : "Archive"}
          </button>
          <button onClick={() => setConfirmingDelete(true)} className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-gray-100 cursor-pointer">
            Delete
          </button>
        </>
      )}
    </div>
  );
}
