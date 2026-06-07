import { useState, useCallback, useMemo, useEffect } from "react";
import { truncateMiddle } from "./utils";
import { useWorkspacePanelStore } from "../../../stores/workspace-panel";

interface BashArtifactProps {
  input: Record<string, unknown>;
  result?: { output: string; success: boolean };
}

const MAX_LINES = 20;
const LOCALHOST_RE = /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)(\/\S*)?/g;

function extractLocalhostUrl(output: string): string | null {
  const matches = output.match(LOCALHOST_RE);
  if (!matches || matches.length === 0) return null;
  return matches[matches.length - 1];
}

export function BashArtifact({ input, result }: BashArtifactProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const command = (input.command as string) || "";
  const output = result?.output || "";
  const success = result?.success ?? true;
  const lines = output.split("\n");
  const shouldCollapse = lines.length > MAX_LINES;

  const displayedOutput = expanded || !shouldCollapse
    ? output
    : lines.slice(0, MAX_LINES).join("\n");

  const localhostUrl = useMemo(() => {
    if (!result || !success) return null;
    return extractLocalhostUrl(output);
  }, [result, success, output]);

  useEffect(() => {
    if (localhostUrl) {
      useWorkspacePanelStore.getState().setPreviewUrl(localhostUrl, localhostUrl);
    }
  }, [localhostUrl]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  if (!result) {
    return (
      <div className="animate-fade-in rounded-[var(--radius-sm)] border border-gray-200 bg-gray-900 px-3 py-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-400" />
          <span className="font-mono text-gray-300">{truncateMiddle(command, 60)}</span>
          <span className="text-gray-500">Running...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`animate-fade-in overflow-hidden rounded-[var(--radius-sm)] border ${
      success ? "border-gray-700" : "border-red-800"
    } bg-gray-900`}>
      <div className="flex items-center justify-between border-b border-gray-700 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${success ? "bg-green-500" : "bg-red-500"}`} />
          <span className="font-mono text-xs text-gray-300" title={command}>
            {truncateMiddle(command, 80)}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="text-[10px] text-gray-500 hover:text-gray-300 cursor-pointer"
        >
          {copied ? "已复制!" : "复制"}
        </button>
      </div>
      {output && (
        <div className="overflow-x-auto p-3">
          <pre className="font-mono text-xs leading-5 text-green-400 whitespace-pre-wrap break-all">
            {displayedOutput}
          </pre>
        </div>
      )}
      {shouldCollapse && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full border-t border-gray-700 py-1.5 text-center text-[10px] text-gray-500 hover:text-gray-300 cursor-pointer"
        >
          {expanded ? "收起" : `Show ${lines.length - MAX_LINES} more lines`}
        </button>
      )}
    </div>
  );
}
