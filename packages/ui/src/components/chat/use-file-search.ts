import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../../services/api-client";

interface FlatFile {
  name: string;
  path: string;
}

interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeNode[];
}

function flattenTree(nodes: FileTreeNode[]): FlatFile[] {
  const result: FlatFile[] = [];
  for (const node of nodes) {
    if (node.type === "file") {
      result.push({ name: node.name, path: node.path });
    }
    if (node.children) {
      result.push(...flattenTree(node.children));
    }
  }
  return result;
}

export function useFileSearch(workspace: string | undefined) {
  const [files, setFiles] = useState<FlatFile[]>([]);
  const [loading, setLoading] = useState(false);
  const cachedWorkspace = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!workspace || workspace === cachedWorkspace.current) return;
    cachedWorkspace.current = workspace;
    setLoading(true);
    api.system.listFiles(workspace, 3)
      .then((res) => {
        const flat = flattenTree(res.tree as FileTreeNode[]);
        setFiles(flat);
      })
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  }, [workspace]);

  const search = useCallback((query: string): FlatFile[] => {
    if (!query) return files.slice(0, 20);
    const lower = query.toLowerCase();
    return files
      .filter((f) => f.name.toLowerCase().includes(lower) || f.path.toLowerCase().includes(lower))
      .slice(0, 20);
  }, [files]);

  return { search, loading, hasFiles: files.length > 0 };
}
