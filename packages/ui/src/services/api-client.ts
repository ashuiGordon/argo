import { useAuthStore } from "../stores/auth";

const BASE_URL = "/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new ApiError(res.status, error.error?.message || res.statusText, error.error?.code);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export const api = {
  auth: {
    register: (email: string, password: string) =>
      request<{ token: string; user: { id: string; email: string } }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    login: (email: string, password: string) =>
      request<{ token: string; user: { id: string; email: string } }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
  },
  conversations: {
    list: (page = 1, limit = 20, search?: string) => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("search", search);
      return request<{ conversations: unknown[]; total: number }>(`/conversations?${params}`);
    },
    create: (mode: string, agentIds: string[], title?: string, workspace?: string, teamPresetId?: string) =>
      request<{ id: string; title: string; mode: string; agents: unknown[] }>("/conversations", {
        method: "POST",
        body: JSON.stringify({ mode, agentIds, title, workspace, teamPresetId }),
      }),
    update: (id: string, data: { title?: string; pinned?: boolean; archived?: boolean }) =>
      request(`/conversations/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/conversations/${id}`, { method: "DELETE" }),
    events: (id: string, afterSequence = 0, limit = 100) =>
      request<{ events: unknown[]; hasMore: boolean }>(
        `/conversations/${id}/events?afterSequence=${afterSequence}&limit=${limit}`,
      ),
    markRead: (id: string) =>
      request<{ ok: boolean }>(`/conversations/${id}/read`, { method: "POST" }),
  },
  messages: {
    send: (conversationId: string, content: string, workspace?: string) =>
      request<{ accepted: boolean; sessionId: string }>(`/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content, workspace }),
      }),
  },
  agents: {
    list: () => request<{ agents: unknown[] }>("/agents"),
    create: (data: { name: string; avatarColor: string; systemPrompt?: string; role?: string; model?: string; disallowedTools?: string[]; capabilities?: string[]; config?: Record<string, unknown> }) =>
      request<{ id: string }>("/agents", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; avatarColor?: string; systemPrompt?: string; role?: string; model?: string; disallowedTools?: string[]; capabilities?: string[]; config?: Record<string, unknown> }) =>
      request(`/agents/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/agents/${id}`, { method: "DELETE" }),
    uploadAvatar: async (id: string, file: File): Promise<{ avatarUrl: string }> => {
      const token = useAuthStore.getState().token;
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${BASE_URL}/agents/${id}/avatar`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new ApiError(res.status, "Upload failed");
      return res.json();
    },
  },
  approvals: {
    decide: (id: string, decision: "approve" | "deny") =>
      request(`/approvals/${id}/decide`, { method: "POST", body: JSON.stringify({ decision }) }),
    pending: () => request<{ approvals: unknown[] }>("/approvals/pending"),
  },
  sessions: {
    terminate: (sessionId: string) =>
      request(`/sessions/${sessionId}`, { method: "DELETE" }),
    status: (sessionId: string) =>
      request<{ sessionId: string; status: string; provider: string; isActive: boolean }>(`/sessions/${sessionId}/status`),
  },
  system: {
    listDirectories: (path?: string) => {
      const params = path ? `?path=${encodeURIComponent(path)}` : "";
      return request<{
        current: string;
        parent: string;
        breadcrumbs: Array<{ name: string; path: string }>;
        directories: Array<{ name: string; path: string }>;
      }>(`/system/directories${params}`);
    },
    listFiles: (path: string, depth = 3) => {
      const params = `?path=${encodeURIComponent(path)}&depth=${depth}`;
      return request<{
        tree: Array<{ name: string; path: string; type: "file" | "directory"; children?: unknown[] }>;
        root: string;
      }>(`/system/files${params}`);
    },
    readFile: (path: string) => {
      const params = `?path=${encodeURIComponent(path)}`;
      return request<{ content: string; language: string; path: string; name: string }>(
        `/system/file-content${params}`,
      );
    },
    pickFolder: () =>
      request<{ path: string | null; cancelled?: boolean }>("/system/pick-folder", {
        method: "POST",
      }),
    worktrees: (workspace: string) => {
      const params = `?workspace=${encodeURIComponent(workspace)}`;
      return request<{
        active: Array<{ path: string; branch: string; sessionId: string; conversationId: string; baseBranch: string }>;
        git: Array<{ path: string; branch: string; head: string }>;
      }>(`/system/worktrees${params}`);
    },
    gitLog: (workspace: string, limit = 20) => {
      const params = `?workspace=${encodeURIComponent(workspace)}&limit=${limit}`;
      return request<{ commits: Array<{ hash: string; message: string; author: string; date: string }> }>(`/system/git-log${params}`);
    },
  },
  deployments: {
    create: (data: {
      conversationId: string;
      type: "preview" | "static" | "container" | "package";
      target: string;
      workspace: string;
      buildCommand?: string;
      sessionId?: string;
    }) =>
      request<{ id: string; status: string }>("/deployments", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    get: (id: string) =>
      request<{ deployment: {
        id: string; conversationId: string; type: string; status: string;
        target: string; url?: string; workspace: string; metadata?: Record<string, unknown>;
        createdAt: string; updatedAt: string;
      } }>(`/deployments/${id}`),
    list: (conversationId: string) =>
      request<{ deployments: Array<{
        id: string; conversationId: string; type: string; status: string;
        target: string; url?: string; workspace: string; metadata?: Record<string, unknown>;
        createdAt: string; updatedAt: string;
      }> }>(`/deployments?conversation_id=${conversationId}`),
    cancel: (id: string) =>
      request<{ ok: boolean }>(`/deployments/${id}`, { method: "DELETE" }),
    downloadUrl: (deploymentId: string, filename: string) =>
      `${BASE_URL}/deployments/download/${deploymentId}/${filename}`,
  },
};
