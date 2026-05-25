import { useState, useRef, useCallback } from "react";

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, disabled, onSend]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    }
  }

  return (
    <div className="border-t border-gray-200 px-6 py-4">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-3 rounded-[var(--radius-md)] border border-gray-200 bg-white px-4 py-3 transition-colors focus-within:border-gray-400 shadow-sm">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="Type a message…"
            disabled={disabled}
            rows={1}
            className="max-h-[200px] flex-1 resize-none bg-transparent text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none"
          />
          <button
            onClick={handleSubmit}
            disabled={disabled || !value.trim()}
            className="rounded-[var(--radius-pill)] bg-gray-900 px-4 py-1.5 text-[12px] font-500 text-white transition-opacity hover:opacity-90 disabled:opacity-30 cursor-pointer"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
