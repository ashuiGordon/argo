interface MessageToolbarProps {
  content: string;
  onCopy: () => void;
  onQuote?: () => void;
  onRegenerate?: () => void;
}

export function MessageToolbar({ onCopy, onQuote, onRegenerate }: MessageToolbarProps) {
  return (
    <div className="absolute -top-8 right-2 flex gap-1 rounded-[var(--radius-sm)] border border-gray-200 bg-white p-0.5 opacity-0 shadow-md transition-opacity group-hover:opacity-100">
      <button
        onClick={onCopy}
        className="rounded px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
        title="Copy"
      >
        Copy
      </button>
      {onQuote && (
        <button
          onClick={onQuote}
          className="rounded px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
          title="Quote"
        >
          Quote
        </button>
      )}
      {onRegenerate && (
        <button
          onClick={onRegenerate}
          className="rounded px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
          title="Regenerate"
        >
          Retry
        </button>
      )}
    </div>
  );
}
