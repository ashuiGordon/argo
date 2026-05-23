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
    create: (mode: string, agentIds: string[], title?: string) =>
      request<{ id: string; title: string; mode: string; agents: unknown[] }>("/conversations", {
        method: "POST",
        body: JSON.stringify({ mode, agentIds, title }),
      }),
    update: (id: string, data: { title?: string; pinned?: boolean; archived?: boolean }) =>
      request(`/conversations/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/conversations/${id}`, { method: "DELETE" }),
    events: (id: string, afterSequence = 0, limit = 100) =>
      request<{ events: unknown[]; hasMore: boolean }>(
        `/conversations/${id}/events?afterSequence=${afterSequence}&limit=${limit}`,
      ),
  },
  messages: {
    send: (conversationId: string, content: string) =>
      request<{ accepted: boolean; sessionId: string }>(`/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
  },
  agents: {
    list: () => request<{ agents: unknown[] }>("/agents"),
    create: (data: { name: string; avatarColor: string; systemPrompt?: string; capabilities?: string[] }) =>
      request<{ id: string }>("/agents", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; avatarColor?: string; systemPrompt?: string; capabilities?: string[] }) =>
      request(`/agents/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/agents/${id}`, { method: "DELETE" }),
  },
  approvals: {
    decide: (id: string, decision: "approve" | "deny") =>
      request(`/approvals/${id}/decide`, { method: "POST", body: JSON.stringify({ decision }) }),
    pending: () => request<{ approvals: unknown[] }>("/approvals/pending"),
  },
  sessions: {
    createPty: (conversationId: string) =>
      request<{ sessionId: string }>(`/sessions/pty?conversationId=${conversationId}`, { method: "POST" }),
    destroyPty: (sessionId: string) =>
      request(`/sessions/pty/${sessionId}`, { method: "DELETE" }),
  },
};
