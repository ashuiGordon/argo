import { useState } from "react";
import type { NormalizedEvent } from "@argo/shared";

interface ToolUseCardProps {
  event: NormalizedEvent & { type: "tool_use" };
}

export function ToolUseCard({ event }: ToolUseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasInput = event.input && Object.keys(event.input).length > 0;

  return (
    <div className="mb-3 ml-6 animate-fade-in rounded-[var(--radius-sm)] border-l-2 border-l-[#1863dc] border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <button
        onClick={() => hasInput && setExpanded(!expanded)}
        className={`flex w-full items-center gap-2 text-[12px] ${hasInput ? "cursor-pointer" : ""}`}
      >
        <span className="rounded-[3px] bg-white/[0.06] px-1.5 py-0.5 font-mono text-white">
          {event.tool}
        </span>
        <span className="text-[#75758a]">invoked</span>
        {hasInput && (
          <span className="ml-auto text-[#75758a]">{expanded ? "▾" : "▸"}</span>
        )}
      </button>
      {expanded && hasInput && (
        <pre className="mt-2 overflow-x-auto rounded-[var(--radius-xs)] bg-[#0f0f13] p-2.5 text-[11px] text-[#93939f] font-mono">
          {JSON.stringify(event.input, null, 2).slice(0, 500)}
        </pre>
      )}
    </div>
  );
}
