import Editor from "@monaco-editor/react";
import { useEditorStore } from "../../stores/editor";

export function CodeTab() {
  const { isOpen, mode, filePath, content, language, setContent } = useEditorStore();

  if (!isOpen || !filePath) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-gray-400">
        <svg className="h-10 w-10 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <span className="text-sm font-medium text-gray-500">代码编辑器</span>
        <span className="text-xs mt-1">请在左侧文件导航中打开任意文件</span>
      </div>
    );
  }

  const fileName = filePath.split("/").pop() || filePath;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-xs text-gray-700 truncate">{fileName}</span>
          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 shrink-0">{language}</span>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${mode === "readonly" ? "bg-gray-100 text-gray-500" : "bg-green-50 text-green-600"}`}>
            {mode === "readonly" ? "只读" : "编辑"}
          </span>
        </div>
      </div>
      <div className="flex-1">
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
      </div>
    </div>
  );
}
