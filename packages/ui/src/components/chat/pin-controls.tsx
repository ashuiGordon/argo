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
        className={`rounded px-2 py-0.5 text-[10px] cursor-pointer ${
          isPinned
            ? "bg-amber-100 text-amber-700"
            : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        }`}
        title={isPinned ? "Unpin message" : "Pin message"}
      >
        {isPinned ? "📌" : "Pin"}
      </button>
      {pinnedCount !== undefined && pinnedCount > 0 && (
        <span className="text-[10px] text-gray-500">{pinnedCount} pinned</span>
      )}
    </div>
  );
}
