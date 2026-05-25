interface ViewTabsProps {
  activeView: "chat" | "terminal";
  onViewChange: (view: "chat" | "terminal") => void;
  hasActiveSession: boolean;
}

export function ViewTabs({ activeView, onViewChange, hasActiveSession }: ViewTabsProps) {
  return (
    <div className="flex items-center gap-0 border-b border-gray-200 bg-white">
      <button
        onClick={() => onViewChange("chat")}
        className={`relative px-5 py-3 text-[13px] font-500 transition-colors cursor-pointer ${
          activeView === "chat"
            ? "text-gray-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-gray-900"
            : "text-gray-500 hover:text-gray-900"
        }`}
      >
        Chat
      </button>
      <button
        onClick={() => onViewChange("terminal")}
        disabled={!hasActiveSession}
        className={`relative px-5 py-3 text-[13px] font-500 transition-colors cursor-pointer ${
          activeView === "terminal"
            ? "text-gray-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-gray-900"
            : "text-gray-500 hover:text-gray-900"
        } disabled:cursor-not-allowed disabled:opacity-30`}
      >
        Terminal
      </button>
    </div>
  );
}
