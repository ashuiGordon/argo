import { useState } from "react";
import type { NormalizedEvent } from "@argo/shared";

interface GenericToolCardProps {
  toolUse: NormalizedEvent & { type: "tool_use" };
}

export function GenericToolCard({ toolUse }: GenericToolCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasInput = toolUse.input && Object.keys(toolUse.input).length > 0;

  return (
    <div className="mb-3 ml-6 animate-fade-in rounded-[var(--radius-sm)] border-l-2 border-l-blue-500 border border-gray-200 bg-gray-50 px-3 py-2">
      <button
        onClick={() => hasInput && setExpanded(!expanded)}
        className={`flex w-full items-center gap-2 text-[12px] ${hasInput ? "cursor-pointer" : ""}`}
      >
        <span className="rounded-[3px] bg-gray-200 px-1.5 py-0.5 font-mono text-gray-800">
          {toolUse.tool}
        </span>
        <span className="text-gray-500">invoked</span>
        {hasInput && (
          <span className="ml-auto text-gray-400">{expanded ? "▾" : "▸"}</span>
        )}
      </button>
      {expanded && hasInput && (
        <pre className="mt-2 overflow-x-auto rounded-[var(--radius-xs)] bg-gray-100 p-2.5 text-[11px] text-gray-600 font-mono">
          {JSON.stringify(toolUse.input, null, 2).slice(0, 500)}
        </pre>
      )}
    </div>
  );
}
