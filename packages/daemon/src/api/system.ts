import { Hono } from "hono";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, sep, extname, basename, relative } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";
import { platform } from "node:os";
import type { Env } from "./types.js";
import { getWorktreeManager } from "../worktree/manager.js";

interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeNode[];
}

const IGNORED_NAMES = new Set([
  "node_modules", ".git", "__pycache__", ".DS_Store", ".next", ".nuxt",
  "dist", "build", ".cache", ".turbo", "coverage", ".venv", "venv",
]);

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

function buildTree(dirPath: string, depth: number, maxDepth: number): FileTreeNode[] {
  if (depth >= maxDepth) return [];

  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });
    const nodes: FileTreeNode[] = [];

    for (const entry of entries) {
      if (entry.name.startsWith(".") && depth === 0) continue;
      if (IGNORED_NAMES.has(entry.name)) continue;

      const fullPath = resolve(dirPath, entry.name);

      if (entry.isDirectory()) {
        nodes.push({
          name: entry.name,
          path: fullPath,
          type: "directory",
          children: buildTree(fullPath, depth + 1, maxDepth),
        });
      } else if (entry.isFile()) {
        nodes.push({ name: entry.name, path: fullPath, type: "file" });
      }
    }

    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return nodes;
  } catch {
    return [];
  }
}

function detectLang(filePath: string): string {
  const ext = extname(filePath).slice(1);
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    py: "python", rs: "rust", go: "go", java: "java", rb: "ruby",
    json: "json", yaml: "yaml", yml: "yaml", toml: "toml",
    md: "markdown", html: "html", css: "css", scss: "scss",
    sql: "sql", sh: "shell", bash: "shell", zsh: "shell",
    xml: "xml", svg: "xml", graphql: "graphql", prisma: "prisma",
  };
  return map[ext] || "plaintext";
}

export const systemRoutes = new Hono<Env>();

systemRoutes.get("/directories", (c) => {
  const requestedPath = c.req.query("path") || homedir();
  const resolvedPath = resolve(requestedPath);

  try {
    const entries = readdirSync(resolvedPath, { withFileTypes: true });
    const directories = entries
      .filter((e) => {
        if (!e.isDirectory()) return false;
        if (e.name.startsWith(".")) return false;
        if (e.name === "node_modules" || e.name === "__pycache__") return false;
        return true;
      })
      .map((e) => ({
        name: e.name,
        path: resolve(resolvedPath, e.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const parts = resolvedPath.split(sep).filter(Boolean);
    const breadcrumbs = parts.map((_, i) => ({
      name: parts[i],
      path: sep + parts.slice(0, i + 1).join(sep),
    }));

    return c.json({
      current: resolvedPath,
      parent: resolve(resolvedPath, ".."),
      breadcrumbs,
      directories,
    });
  } catch {
    return c.json({ error: { code: "READ_ERROR", message: `Cannot read directory: ${resolvedPath}` } }, 400);
  }
});

systemRoutes.get("/files", (c) => {
  const requestedPath = c.req.query("path");
  if (!requestedPath) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "path query parameter required" } }, 400);
  }

  const resolvedPath = resolve(requestedPath);
  const depth = Math.min(Number(c.req.query("depth") || "3"), 5);

  try {
    const stat = statSync(resolvedPath);
    if (!stat.isDirectory()) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "Path is not a directory" } }, 400);
    }
  } catch {
    return c.json({ error: { code: "NOT_FOUND", message: `Directory not found: ${resolvedPath}` } }, 404);
  }

  const tree = buildTree(resolvedPath, 0, depth);
  return c.json({ tree, root: resolvedPath });
});

systemRoutes.get("/file-content", (c) => {
  const filePath = c.req.query("path");
  if (!filePath) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "path query parameter required" } }, 400);
  }

  const resolvedPath = resolve(filePath);

  try {
    const stat = statSync(resolvedPath);
    if (!stat.isFile()) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "Path is not a file" } }, 400);
    }
    if (stat.size > MAX_FILE_SIZE) {
      return c.json({ error: { code: "FILE_TOO_LARGE", message: "File exceeds 1MB limit" } }, 400);
    }
  } catch {
    return c.json({ error: { code: "NOT_FOUND", message: `File not found: ${resolvedPath}` } }, 404);
  }

  try {
    const content = readFileSync(resolvedPath, "utf-8");
    const language = detectLang(resolvedPath);
    return c.json({ content, language, path: resolvedPath, name: basename(resolvedPath) });
  } catch {
    return c.json({ error: { code: "READ_ERROR", message: `Cannot read file: ${resolvedPath}` } }, 400);
  }
});

systemRoutes.post("/pick-folder", async (c) => {
  const os = platform();

  try {
    let selectedPath: string | null = null;

    if (os === "darwin") {
      const result = execSync(
        `osascript -e 'POSIX path of (choose folder with prompt "Select workspace folder")'`,
        { timeout: 60000, encoding: "utf8" },
      ).trim();
      if (result) selectedPath = result.replace(/\/$/, "");
    } else if (os === "linux") {
      const result = execSync(
        `zenity --file-selection --directory --title="Select workspace folder" 2>/dev/null || kdialog --getexistingdirectory ~ 2>/dev/null`,
        { timeout: 60000, encoding: "utf8" },
      ).trim();
      if (result) selectedPath = result;
    } else if (os === "win32") {
      const result = execSync(
        `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.ShowDialog() | Out-Null; $f.SelectedPath"`,
        { timeout: 60000, encoding: "utf8" },
      ).trim();
      if (result) selectedPath = result;
    }

    if (selectedPath) {
      return c.json({ path: selectedPath });
    }
    return c.json({ path: null, cancelled: true });
  } catch {
    return c.json({ path: null, cancelled: true });
  }
});

systemRoutes.get("/worktrees", (c) => {
  const workspace = c.req.query("workspace");
  if (!workspace) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "workspace query parameter required" } }, 400);
  }

  const manager = getWorktreeManager();
  const active = manager.list(workspace);
  const gitWorktrees = manager.listGitWorktrees(workspace);

  return c.json({
    active: active.map((w) => ({
      path: w.path,
      branch: w.branch,
      sessionId: w.sessionId,
      conversationId: w.conversationId,
      baseBranch: w.baseBranch,
    })),
    git: gitWorktrees,
  });
});
