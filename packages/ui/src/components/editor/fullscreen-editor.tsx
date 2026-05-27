import { useState, useCallback } from "react";
import Editor, { DiffEditor as MonacoDiff } from "@monaco-editor/react";
import { useEditorStore } from "../../stores/editor";
import { VersionTimeline } from "./version-timeline";
import { getFileName } from "../chat/artifacts/utils";

interface FullscreenEditorProps {
  onSendMessage?: (content: string) => void;
}

export function FullscreenEditor({ onSendMessage }: FullscreenEditorProps) {
  const { isOpen, mode, filePath, content, original, language, versions, close, setContent } =
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

  if (!isOpen) return null;

  const fileName = getFileName(filePath);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-gray-700" title={filePath}>
            {fileName}
          </span>
          <span className="rounded-[3px] bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
            {language}
          </span>
          <span className={`rounded-[3px] px-2 py-0.5 text-[10px] font-medium ${
            mode === "diff"
              ? "bg-purple-50 text-purple-600"
              : mode === "readonly"
                ? "bg-gray-100 text-gray-500"
                : "bg-green-50 text-green-600"
          }`}>
            {mode === "diff" ? "Diff" : mode === "readonly" ? "Read-only" : "Editing"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="rounded-[var(--radius-sm)] border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          {mode === "edit" && onSendMessage && (
            <button
              onClick={handleSaveAndSend}
              className="rounded-[var(--radius-sm)] bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 cursor-pointer"
            >
              Save & Send to Agent
            </button>
          )}
          <button
            onClick={close}
            className="rounded-[var(--radius-sm)] border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
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

        {/* Version Timeline (if versions available) */}
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
