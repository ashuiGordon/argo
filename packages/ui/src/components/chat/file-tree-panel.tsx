import { useState, useEffect, useCallback } from "react";
import { Tree } from "react-arborist";
import type { NodeRendererProps } from "react-arborist";
import { api } from "../../services/api-client";
import { useEditorStore } from "../../stores/editor";

interface FileNode {
  id: string;
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

interface FileTreePanelProps {
  workspace: string;
  onClose: () => void;
}

function transformTree(nodes: Array<{ name: string; path: string; type: "file" | "directory"; children?: unknown[] }>): FileNode[] {
  return nodes.map((node) => ({
    id: node.path,
    name: node.name,
    path: node.path,
    type: node.type,
    children: node.type === "directory" && node.children
      ? transformTree(node.children as Array<{ name: string; path: string; type: "file" | "directory"; children?: unknown[] }>)
      : undefined,
  }));
}

const FILE_ICONS: Record<string, string> = {
  ts: "text-blue-500",
  tsx: "text-blue-500",
  js: "text-yellow-500",
  jsx: "text-yellow-500",
  json: "text-green-600",
  md: "text-gray-500",
  css: "text-purple-500",
  html: "text-orange-500",
  py: "text-green-500",
  rs: "text-orange-600",
  go: "text-cyan-500",
};

function getFileColor(name: string): string {
  const ext = name.split(".").pop() || "";
  return FILE_ICONS[ext] || "text-gray-400";
}

function Node({ node, style }: NodeRendererProps<FileNode>) {
  const isDir = node.data.type === "directory";

  return (
    <div
      style={style}
      className={`flex items-center gap-1.5 px-2 py-0.5 cursor-pointer select-none text-[12px] hover:bg-gray-100 ${
        node.isSelected ? "bg-blue-50" : ""
      }`}
      onClick={() => node.isInternal ? node.toggle() : node.activate()}
    >
      {isDir ? (
        <svg className="h-3.5 w-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {node.isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          )}
        </svg>
      ) : (
        <svg className={`h-3.5 w-3.5 shrink-0 ${getFileColor(node.data.name)}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      )}
      <span className={`truncate ${isDir ? "text-gray-700 font-medium" : "text-gray-600"}`}>
        {node.data.name}
      </span>
    </div>
  );
}

export function FileTreePanel({ workspace, onClose }: FileTreePanelProps) {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const openEditor = useEditorStore((s) => s.openEditor);

  const workspaceName = workspace.split("/").pop() || workspace;

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.system.listFiles(workspace, 4)
      .then((res) => {
        setTree(transformTree(res.tree));
      })
      .catch((err) => {
        setError(err.message || "Failed to load files");
      })
      .finally(() => setLoading(false));
  }, [workspace]);

  const handleActivate = useCallback(async (node: { data: FileNode }) => {
    if (node.data.type !== "file") return;
    const ext = node.data.path.split(".").pop()?.toLowerCase() || "";
    const binaryExts = ["pdf", "png", "jpg", "jpeg", "gif", "webp", "docx", "doc", "pptx", "ppt", "xlsx", "xls"];
    if (binaryExts.includes(ext)) {
      const { useFilePreviewStore } = await import("../../stores/file-preview");
      useFilePreviewStore.getState().open(node.data.path);
      return;
    }
    try {
      const res = await api.system.readFile(node.data.path);
      openEditor({ filePath: res.path, content: res.content, language: res.language, mode: "readonly" });
    } catch {
      // silently fail for unreadable files
    }
  }, [openEditor]);

  return (
    <aside className="w-[240px] shrink-0 border-l border-gray-200 bg-[#f8f9fa] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <svg className="h-3.5 w-3.5 shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
          <span className="text-[11px] font-medium text-gray-700 truncate" title={workspace}>
            {workspaceName}
          </span>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 cursor-pointer"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <span className="text-[11px] text-gray-400">Loading...</span>
          </div>
        )}
        {error && (
          <div className="px-3 py-4 text-[11px] text-red-500">{error}</div>
        )}
        {!loading && !error && (
          <Tree<FileNode>
            data={tree}
            width="100%"
            height={800}
            rowHeight={26}
            indent={16}
            openByDefault={false}
            disableDrag={true}
            disableDrop={true}
            disableEdit={true}
            onActivate={(node) => handleActivate(node)}
          >
            {Node}
          </Tree>
        )}
      </div>
    </aside>
  );
}
