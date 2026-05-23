interface ViewTabsProps {
  activeView: "chat" | "terminal";
  onViewChange: (view: "chat" | "terminal") => void;
  hasActiveSession: boolean;
}

export function ViewTabs({ activeView, onViewChange, hasActiveSession }: ViewTabsProps) {
  return (
    <div className="flex items-center gap-0 border-b border-white/[0.08] bg-[#17171c]">
      <button
        onClick={() => onViewChange("chat")}
        className={`relative px-5 py-3 text-[13px] font-500 transition-colors cursor-pointer ${
          activeView === "chat"
            ? "text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-white"
            : "text-[#93939f] hover:text-white"
        }`}
      >
        Chat
      </button>
      <button
        onClick={() => onViewChange("terminal")}
        disabled={!hasActiveSession}
        className={`relative px-5 py-3 text-[13px] font-500 transition-colors cursor-pointer ${
          activeView === "terminal"
            ? "text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-white"
            : "text-[#93939f] hover:text-white"
        } disabled:cursor-not-allowed disabled:opacity-30`}
      >
        Terminal
      </button>
    </div>
  );
}
