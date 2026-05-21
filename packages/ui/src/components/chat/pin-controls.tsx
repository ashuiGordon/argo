interface PinControlsProps {
  isPinned: boolean;
  onTogglePin: () => void;
  pinnedCount?: number;
}

export function PinControls({ isPinned, onTogglePin, pinnedCount }: PinControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onTogglePin}
        className={`rounded px-2 py-0.5 text-[10px] ${
          isPinned
            ? "bg-amber-900/30 text-amber-400"
            : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
        }`}
        title={isPinned ? "Unpin message" : "Pin message"}
      >
        {isPinned ? "📌" : "Pin"}
      </button>
      {pinnedCount !== undefined && pinnedCount > 0 && (
        <span className="text-[10px] text-zinc-500">{pinnedCount} pinned</span>
      )}
    </div>
  );
}
