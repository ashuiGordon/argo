import { useEffect, useRef, useState, useCallback } from "react";
import { useChatContextStore } from "../../../stores/chat-context";

interface SelectionToolbarProps {
  filePath: string;
}

export function useCodeSelection(filePath: string, containerRef: React.RefObject<HTMLElement | null>) {
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState("");
  const setContext = useChatContextStore((s) => s.setContext);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleMouseUp() {
      const selection = window.getSelection();
      const text = selection?.toString().trim() || "";

      if (text && container?.contains(selection?.anchorNode || null)) {
        const range = selection!.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const containerRect = container!.getBoundingClientRect();

        setSelectedText(text);
        setToolbarPos({
          top: rect.top - containerRect.top - 32,
          left: rect.left - containerRect.left + rect.width / 2,
        });
        setShowToolbar(true);
      } else {
        setShowToolbar(false);
      }
    }

    container.addEventListener("mouseup", handleMouseUp);
    return () => container.removeEventListener("mouseup", handleMouseUp);
  }, [containerRef]);

  const handleAskModify = useCallback(() => {
    setContext({ filePath, selectedCode: selectedText });
    setShowToolbar(false);
    window.getSelection()?.removeAllRanges();
  }, [filePath, selectedText, setContext]);

  return { showToolbar, toolbarPos, handleAskModify };
}

export function SelectionToolbar({ position, onAskModify }: { position: { top: number; left: number }; onAskModify: () => void }) {
  return (
    <div
      className="absolute z-10 -translate-x-1/2 animate-fade-in"
      style={{ top: position.top, left: position.left }}
    >
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={onAskModify}
        className="rounded-[var(--radius-sm)] bg-gray-900 px-2.5 py-1 text-[10px] font-medium text-white shadow-lg hover:bg-gray-800 cursor-pointer whitespace-nowrap"
      >
        Ask to modify
      </button>
    </div>
  );
}
