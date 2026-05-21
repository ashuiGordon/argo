interface ViewTabsProps {
  activeView: "chat" | "terminal";
  onViewChange: (view: "chat" | "terminal") => void;
  hasActiveSession: boolean;
}

export function ViewTabs({ activeView, onViewChange, hasActiveSession }: ViewTabsProps) {
  return (
    <div className="flex border-b border-zinc-800 bg-zinc-900">
      <button
        onClick={() => onViewChange("chat")}
        className={`px-4 py-2 text-sm font-medium transition-colors ${
          activeView === "chat"
            ? "border-b-2 border-blue-500 text-white"
            : "text-zinc-400 hover:text-zinc-200"
        }`}
      >
        Chat
      </button>
      <button
        onClick={() => onViewChange("terminal")}
        disabled={!hasActiveSession}
        className={`px-4 py-2 text-sm font-medium transition-colors ${
          activeView === "terminal"
            ? "border-b-2 border-blue-500 text-white"
            : "text-zinc-400 hover:text-zinc-200"
        } disabled:cursor-not-allowed disabled:opacity-30`}
      >
        Terminal
      </button>
    </div>
  );
}
