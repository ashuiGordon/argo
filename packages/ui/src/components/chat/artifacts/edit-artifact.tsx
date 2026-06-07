import { useState, useCallback, useRef } from "react";
import { getFileName, detectLanguage } from "./utils";
import { useEditorStore } from "../../../stores/editor";
import { useFileVersionsStore } from "../../../stores/file-versions";
import { useCodeSelection, SelectionToolbar } from "./selection-toolbar";

interface EditArtifactProps {
  input: Record<string, unknown>;
  conversationId?: string;
}

interface DiffLine {
  type: "add" | "remove" | "context";
  content: string;
  lineNum?: number;
}

function computeUnifiedDiff(oldStr: string, newStr: string): DiffLine[] {
  const oldLines = oldStr.split("\n");
  const newLines = newStr.split("\n");
  const result: DiffLine[] = [];

  let oldIdx = 0;
  let newIdx = 0;

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    const oldLine = oldLines[oldIdx];
    const newLine = newLines[newIdx];

    if (oldLine === newLine) {
      result.push({ type: "context", content: oldLine || "", lineNum: newIdx + 1 });
      oldIdx++;
      newIdx++;
    } else {
      if (oldIdx < oldLines.length) {
        result.push({ type: "remove", content: oldLine, lineNum: oldIdx + 1 });
        oldIdx++;
      }
      if (newIdx < newLines.length) {
        result.push({ type: "add", content: newLine, lineNum: newIdx + 1 });
        newIdx++;
      }
    }
  }

  return result;
}

export function EditArtifact({ input, conversationId }: EditArtifactProps) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLDivElement>(null);
  const openDiff = useEditorStore((s) => s.openDiff);
  const filePath = (input.file_path as string) || "unknown";
  const { showToolbar, toolbarPos, handleAskModify } = useCodeSelection(filePath, codeRef);
  const versions = useFileVersionsStore((s) => conversationId ? s.getVersions(conversationId, filePath) : []);
  const oldString = (input.old_string as string) || "";
  const newString = (input.new_string as string) || "";
  const fileName = getFileName(filePath);
  const language = detectLanguage(filePath);

  const lines = computeUnifiedDiff(oldString, newString);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(newString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [newString]);

  return (
    <div className="animate-fade-in overflow-hidden rounded-[var(--radius-sm)] border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2">
        <div className="flex items-center gap-2">
          <svg className="h-3.5 w-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="font-mono text-xs text-gray-700" title={filePath}>{fileName}</span>
          {versions.length > 1 && (
            <span className="rounded-[3px] bg-orange-50 px-1.5 py-0.5 text-[10px] text-orange-600">
              {versions.length} versions
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openDiff({ filePath, original: oldString, modified: newString, language, versions: versions.length > 1 ? versions : undefined })}
            className="text-[10px] text-blue-500 hover:text-blue-700 cursor-pointer"
          >
            Open in Editor
          </button>
          <button
            onClick={handleCopy}
            className="text-[10px] text-gray-400 hover:text-gray-700 cursor-pointer"
          >
            {copied ? "Copied!" : "Copy new"}
          </button>
        </div>
      </div>
      <div ref={codeRef} className="relative overflow-x-auto font-mono text-xs leading-5">
        {showToolbar && <SelectionToolbar position={toolbarPos} onAskModify={handleAskModify} />}
        {lines.map((line, i) => (
          <div
            key={i}
            className={`flex ${
              line.type === "add"
                ? "bg-green-50"
                : line.type === "remove"
                  ? "bg-red-50"
                  : ""
            }`}
          >
            <span className="w-8 shrink-0 select-none border-r border-gray-100 px-1 text-right text-gray-400">
              {line.lineNum || ""}
            </span>
            <span className={`w-4 shrink-0 select-none text-center ${
              line.type === "add" ? "text-green-600" : line.type === "remove" ? "text-red-600" : "text-gray-300"
            }`}>
              {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
            </span>
            <span className={`flex-1 whitespace-pre px-2 ${
              line.type === "add" ? "text-green-800" : line.type === "remove" ? "text-red-800" : "text-gray-700"
            }`}>
              {line.content}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
