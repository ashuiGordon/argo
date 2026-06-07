import { useRef, useEffect, useState } from "react";
import { Pencil, Pin, Trash2 } from "lucide-react";
import { api } from "../../services/api-client";
import { useConversationsStore } from "../../stores/conversations";

interface ConversationMenuProps {
  conversationId: string;
  pinned: boolean;
  archived: boolean;
  onAction: () => void;
  position: { x: number; y: number };
  onClose: () => void;
}

export function ConversationMenu({ conversationId, pinned, onAction, position, onClose }: ConversationMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        if (!showDeleteConfirm) onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, showDeleteConfirm]);

  async function handlePin() {
    await api.conversations.update(conversationId, { pinned: !pinned });
    onAction();
    onClose();
  }

  async function handleDeleteConfirm() {
    setShowDeleteConfirm(false);
    onClose();
    await api.conversations.delete(conversationId);
    onAction();
  }

  function handleRenameStart() {
    const conv = useConversationsStore.getState().conversations.find((c) => c.id === conversationId);
    setRenameValue(conv?.title || "");
    setRenaming(true);
  }

  async function handleRenameSubmit() {
    if (renameValue.trim()) {
      await api.conversations.update(conversationId, { title: renameValue.trim() });
      onAction();
    }
    onClose();
  }

  if (showDeleteConfirm) {
    return (
      <>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowDeleteConfirm(false)}>
          <div className="w-[360px] rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[15px] font-semibold text-gray-900 mb-2">确认永久删除项目?</h3>
            <p className="text-[13px] text-gray-500 leading-relaxed mb-5">
              项目全部内容将被清空，不可撤回、无法找回，确定要删除吗?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="rounded-lg bg-red-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-red-700 cursor-pointer"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-44 rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg"
      style={{ top: position.y, left: position.x }}
    >
      {renaming ? (
        <div className="px-3 py-2">
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleRenameSubmit(); if (e.key === "Escape") onClose(); }}
            className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-[13px] text-gray-900 focus:outline-none focus:border-blue-400"
            placeholder="输入新名称"
          />
          <div className="flex justify-end gap-1.5 mt-2">
            <button onClick={onClose} className="text-[11px] text-gray-400 hover:text-gray-600 cursor-pointer">取消</button>
            <button onClick={handleRenameSubmit} className="text-[11px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer">确定</button>
          </div>
        </div>
      ) : (
        <>
          <button onClick={handleRenameStart} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-gray-700 hover:bg-gray-50 rounded-lg mx-1 w-[calc(100%-8px)] cursor-pointer">
            <Pencil className="h-4 w-4 text-gray-400" />
            重命名
          </button>
          <button onClick={handlePin} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-gray-700 hover:bg-gray-50 rounded-lg mx-1 w-[calc(100%-8px)] cursor-pointer">
            <Pin className="h-4 w-4 text-gray-400" />
            {pinned ? "取消置顶" : "置顶"}
          </button>
          <div className="my-1 mx-2 border-t border-gray-100" />
          <button onClick={() => setShowDeleteConfirm(true)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-red-600 hover:bg-red-50 rounded-lg mx-1 w-[calc(100%-8px)] cursor-pointer">
            <Trash2 className="h-4 w-4 text-red-400" />
            删除
          </button>
        </>
      )}
    </div>
  );
}
