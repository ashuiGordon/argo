import Editor from "@monaco-editor/react";
import { FileTreePanel } from "../chat/file-tree-panel";
import { useEditorStore } from "../../stores/editor";

interface FilesTabProps {
  workspace?: string;
}

export function FilesTab({ workspace }: FilesTabProps) {
  const { isOpen, mode, filePath, content, language, setContent } = useEditorStore();

  if (!workspace) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400 text-sm">
        No workspace selected
      </div>
    );
  }

  const fileName = filePath?.split("/").pop() || "";

  return (
    <div className="flex h-full overflow-hidden">
      {/* File tree */}
      <div className="w-[200px] shrink-0 border-r border-gray-200 overflow-hidden">
        <FileTreePanel workspace={workspace} embedded />
      </div>
      {/* Editor */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {isOpen && filePath ? (
          <>
            <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-1.5 shrink-0">
              <span className="font-mono text-xs text-gray-700 truncate">{fileName}</span>
              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 shrink-0">{language}</span>
              {mode === "readonly" && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 shrink-0">只读</span>}
            </div>
            <div className="flex-1 min-h-0">
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
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-gray-400">
            <svg className="h-10 w-10 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <span className="text-sm font-medium text-gray-500">代码编辑器</span>
            <span className="text-xs mt-1">点击左侧文件打开</span>
          </div>
        )}
      </div>
    </div>
  );
}
