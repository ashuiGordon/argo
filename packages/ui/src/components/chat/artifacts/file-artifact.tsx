import { useState, useCallback, useRef, useEffect } from "react";
import { getFileName, detectLanguage } from "./utils";
import { useEditorStore } from "../../../stores/editor";
import { useFileVersionsStore } from "../../../stores/file-versions";
import { useCodeSelection, SelectionToolbar } from "./selection-toolbar";
import { useWorkspacePanelStore } from "../../../stores/workspace-panel";

interface FileArtifactProps {
  input: Record<string, unknown>;
  conversationId?: string;
}

const MAX_LINES = 30;
const PREVIEW_LINES = 20;

export function FileArtifact({ input, conversationId }: FileArtifactProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLDivElement>(null);
  const openEditor = useEditorStore((s) => s.openEditor);
  const filePath = (input.file_path as string) || "unknown";
  const { showToolbar, toolbarPos, handleAskModify } = useCodeSelection(filePath, codeRef);
  const versions = useFileVersionsStore((s) => conversationId ? s.getVersions(conversationId, filePath) : []);

  const content = (input.content as string) || "";
  const fileName = getFileName(filePath);
  const language = detectLanguage(filePath);
  const isHtml = /\.html?$/i.test(filePath);

  useEffect(() => {
    if (isHtml && content) {
      useWorkspacePanelStore.getState().setPreviewHtml(content, fileName);
    }
  }, []);
  const lines = content.split("\n");
  const shouldCollapse = lines.length > MAX_LINES;
  const displayedContent = expanded || !shouldCollapse
    ? content
    : lines.slice(0, PREVIEW_LINES).join("\n");

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  return (
    <div className="animate-fade-in overflow-hidden rounded-[var(--radius-sm)] border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2">
        <div className="flex items-center gap-2">
          <svg className="h-3.5 w-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span className="font-mono text-xs text-gray-700" title={filePath}>{fileName}</span>
          <span className="rounded-[3px] bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">
            {language}
          </span>
          {versions.length > 1 && (
            <span className="rounded-[3px] bg-orange-50 px-1.5 py-0.5 text-[10px] text-orange-600">
              {versions.length} versions
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { openEditor({ filePath, content, language, versions: versions.length > 1 ? versions : undefined }); useWorkspacePanelStore.getState().open("files"); }}
            className="text-[10px] text-blue-500 hover:text-blue-700 cursor-pointer"
          >
            在编辑器中打开
          </button>
          <button
            onClick={handleCopy}
            className="text-[10px] text-gray-400 hover:text-gray-700 cursor-pointer"
          >
            {copied ? "已复制!" : "复制"}
          </button>
        </div>
      </div>
      <div ref={codeRef} className="relative overflow-x-auto font-mono text-xs leading-5">
        {showToolbar && <SelectionToolbar position={toolbarPos} onAskModify={handleAskModify} />}
        {displayedContent.split("\n").map((line, i) => (
          <div key={i} className="flex">
            <span className="w-8 shrink-0 select-none border-r border-gray-100 px-1 text-right text-gray-400">
              {i + 1}
            </span>
            <span className="flex-1 whitespace-pre px-2 text-gray-800">{line}</span>
          </div>
        ))}
      </div>
      {shouldCollapse && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full border-t border-gray-200 bg-gray-50 py-1.5 text-center text-[11px] text-gray-500 hover:text-gray-700 cursor-pointer"
        >
          {expanded ? "收起" : `展开剩余 ${lines.length - PREVIEW_LINES} 行`}
        </button>
      )}
    </div>
  );
}
