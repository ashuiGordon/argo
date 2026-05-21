interface MessageToolbarProps {
  content: string;
  onCopy: () => void;
  onQuote?: () => void;
  onRegenerate?: () => void;
}

export function MessageToolbar({ onCopy, onQuote, onRegenerate }: MessageToolbarProps) {
  return (
    <div className="absolute -top-8 right-2 flex gap-1 rounded border border-zinc-700 bg-zinc-800 p-0.5 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
      <button
        onClick={onCopy}
        className="rounded px-2 py-1 text-[10px] text-zinc-400 hover:bg-zinc-700 hover:text-white"
        title="Copy"
      >
        Copy
      </button>
      {onQuote && (
        <button
          onClick={onQuote}
          className="rounded px-2 py-1 text-[10px] text-zinc-400 hover:bg-zinc-700 hover:text-white"
          title="Quote"
        >
          Quote
        </button>
      )}
      {onRegenerate && (
        <button
          onClick={onRegenerate}
          className="rounded px-2 py-1 text-[10px] text-zinc-400 hover:bg-zinc-700 hover:text-white"
          title="Regenerate"
        >
          Retry
        </button>
      )}
    </div>
  );
}
