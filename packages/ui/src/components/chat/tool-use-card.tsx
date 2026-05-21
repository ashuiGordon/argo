import type { NormalizedEvent } from "@argo/shared";

interface ToolUseCardProps {
  event: NormalizedEvent & { type: "tool_use" };
}

export function ToolUseCard({ event }: ToolUseCardProps) {
  return (
    <div className="mb-3 ml-4 rounded border border-zinc-700 bg-zinc-800/50 px-3 py-2">
      <div className="flex items-center gap-2 text-xs">
        <span className="rounded bg-zinc-700 px-1.5 py-0.5 font-mono text-zinc-300">
          {event.tool}
        </span>
        <span className="text-zinc-500">tool invoked</span>
      </div>
      {event.input && Object.keys(event.input).length > 0 && (
        <pre className="mt-1 overflow-x-auto text-xs text-zinc-400">
          {JSON.stringify(event.input, null, 2).slice(0, 300)}
        </pre>
      )}
    </div>
  );
}
