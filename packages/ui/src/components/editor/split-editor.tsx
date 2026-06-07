import { useState, useCallback } from "react";
import Editor, { DiffEditor as MonacoDiff } from "@monaco-editor/react";
import { useEditorStore } from "../../stores/editor";
import { VersionTimeline } from "./version-timeline";
import { getFileName } from "../chat/artifacts/utils";

interface SplitEditorProps {
  onSendMessage?: (content: string) => void;
}

export function SplitEditor({ onSendMessage }: SplitEditorProps) {
  const { isOpen, mode, filePath, content, original, language, versions, close, setContent, setSplitMode } =
    useEditorStore();
  const [copied, setCopied] = useState(false);
  const [activeVersionIdx, setActiveVersionIdx] = useState<number | null>(null);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const handleSaveAndSend = useCallback(() => {
    if (!onSendMessage) return;
    const msg = `Please update the file \`${filePath}\` with the following content:\n\`\`\`\n${content}\n\`\`\``;
    onSendMessage(msg);
    close();
  }, [content, filePath, onSendMessage, close]);

  const handleVersionSelect = useCallback((index: number) => {
    if (!versions) return;
    const version = versions[index];
    setActiveVersionIdx(index);
    setContent(version.content);
  }, [versions, setContent]);

  const handleFullscreen = useCallback(() => {
    setSplitMode(false);
  }, [setSplitMode]);

  if (!isOpen) return null;

  const fileName = getFileName(filePath);

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-xs text-gray-700 truncate" title={filePath}>
            {fileName}
          </span>
          <span className="rounded-[3px] bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 shrink-0">
            {language}
          </span>
          <span className={`rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${
            mode === "diff"
              ? "bg-purple-50 text-purple-600"
              : mode === "readonly"
                ? "bg-gray-100 text-gray-500"
                : "bg-green-50 text-green-600"
          }`}>
            {mode === "diff" ? "Diff" : mode === "readonly" ? "Read-only" : "Editing"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleCopy}
            className="rounded-[var(--radius-sm)] border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50 cursor-pointer"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          {mode === "edit" && onSendMessage && (
            <button
              onClick={handleSaveAndSend}
              className="rounded-[var(--radius-sm)] bg-blue-600 px-2 py-1 text-[11px] text-white hover:bg-blue-700 cursor-pointer"
            >
              Save & Send
            </button>
          )}
          <button
            onClick={handleFullscreen}
            className="rounded-[var(--radius-sm)] border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50 cursor-pointer"
            title="Fullscreen"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
            </svg>
          </button>
          <button
            onClick={close}
            className="rounded-[var(--radius-sm)] border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50 cursor-pointer"
            title="Close"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1">
          {mode === "diff" && original !== undefined ? (
            <MonacoDiff
              original={original}
              modified={content}
              language={language.toLowerCase()}
              theme="vs"
              options={{
                readOnly: true,
                renderSideBySide: true,
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
              }}
            />
          ) : (
            <Editor
              value={content}
              language={language.toLowerCase()}
              theme="vs"
              onChange={(value) => { if (value !== undefined) setContent(value); }}
              options={{
                readOnly: mode === "readonly",
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                wordWrap: "on",
              }}
            />
          )}
        </div>

        {versions && versions.length > 1 && (
          <VersionTimeline
            versions={versions}
            currentIndex={activeVersionIdx ?? versions.length - 1}
            onSelect={handleVersionSelect}
          />
        )}
      </div>
    </div>
  );
}
