import { useState } from "react";
import { getFileName } from "./utils";
import { FilePreview } from "../../preview/file-preview";

interface ReadArtifactProps {
  input: Record<string, unknown>;
  result?: { output: string; success: boolean };
}

const MAX_LINES = 30;
const BINARY_EXTS = ["pdf", "png", "jpg", "jpeg", "gif", "webp", "svg", "docx", "doc", "pptx", "ppt", "xlsx", "xls"];

export function ReadArtifact({ input, result }: ReadArtifactProps) {
  const [expanded, setExpanded] = useState(false);

  const filePath = (input.file_path as string) || "unknown";
  const fileName = getFileName(filePath);
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  const isBinary = BINARY_EXTS.includes(ext);
  const content = result?.output || "";
  const lines = content.split("\n");
  const lineCount = lines.length;

  if (!result) {
    return (
      <div className="mb-3 ml-6 animate-fade-in rounded-[var(--radius-sm)] border border-gray-200 bg-gray-50 px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-400" />
          <span className="font-mono">{fileName}</span>
          <span>Reading...</span>
        </div>
      </div>
    );
  }

  if (isBinary) {
    return (
      <div className="mb-3 ml-6 animate-fade-in">
        <FilePreview filePath={filePath} />
      </div>
    );
  }

  return (
    <div className="mb-3 ml-6 animate-fade-in overflow-hidden rounded-[var(--radius-sm)] border border-gray-200 bg-white">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <svg className="h-3.5 w-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="font-mono text-xs text-gray-700" title={filePath}>{fileName}</span>
          <span className="rounded-[3px] bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-500">
            {lineCount} lines
          </span>
        </div>
        <span className="text-[10px] text-gray-400">{expanded ? "▾" : "▸"}</span>
      </button>
      {expanded && (
        <div className="max-h-80 overflow-auto font-mono text-xs leading-5">
          {lines.slice(0, MAX_LINES).map((line, i) => (
            <div key={i} className="flex">
              <span className="w-8 shrink-0 select-none border-r border-gray-100 px-1 text-right text-gray-400">
                {i + 1}
              </span>
              <span className="flex-1 whitespace-pre px-2 text-gray-700">{line}</span>
            </div>
          ))}
          {lineCount > MAX_LINES && (
            <div className="border-t border-gray-100 px-3 py-1.5 text-center text-[10px] text-gray-400">
              ... {lineCount - MAX_LINES} more lines
            </div>
          )}
        </div>
      )}
    </div>
  );
}
