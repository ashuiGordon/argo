import { create } from "zustand";

export interface TokenUsage {
  model?: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedInputTokens: number;
  contextUsedTokens?: number;
  contextWindowTokens?: number;
  contextPercent?: number;
}

export interface SessionInfo {
  sessionId: string;
  provider: "claude_code" | "codex";
  status: "starting" | "running" | "stopped" | "crashed";
  tokenUsage?: TokenUsage;
  lastActivityAt?: string;
  hookEvents: HookActivity[];
}

export interface HookActivity {
  id: string;
  hookType: string;
  timestamp: string;
  summary: string;
}

interface SessionsState {
  sessions: Map<string, SessionInfo>;
  updateSession: (sessionId: string, updates: Partial<SessionInfo>) => void;
  setTokenUsage: (sessionId: string, usage: TokenUsage) => void;
  addHookActivity: (sessionId: string, activity: HookActivity) => void;
  removeSession: (sessionId: string) => void;
  getSession: (sessionId: string) => SessionInfo | undefined;
}

export const useSessionsStore = create<SessionsState>((set, get) => ({
  sessions: new Map(),

  updateSession: (sessionId, updates) => {
    const sessions = new Map(get().sessions);
    const existing = sessions.get(sessionId) || {
      sessionId,
      provider: "claude_code" as const,
      status: "starting" as const,
      hookEvents: [],
    };
    sessions.set(sessionId, { ...existing, ...updates });
    set({ sessions });
  },

  setTokenUsage: (sessionId, usage) => {
    const sessions = new Map(get().sessions);
    const existing = sessions.get(sessionId);
    if (existing) {
      sessions.set(sessionId, { ...existing, tokenUsage: usage, lastActivityAt: new Date().toISOString() });
      set({ sessions });
    }
  },

  addHookActivity: (sessionId, activity) => {
    const sessions = new Map(get().sessions);
    const existing = sessions.get(sessionId);
    if (existing) {
      const hookEvents = [...existing.hookEvents, activity].slice(-50);
      sessions.set(sessionId, { ...existing, hookEvents, lastActivityAt: new Date().toISOString() });
      set({ sessions });
    }
  },

  removeSession: (sessionId) => {
    const sessions = new Map(get().sessions);
    sessions.delete(sessionId);
    set({ sessions });
  },

  getSession: (sessionId) => get().sessions.get(sessionId),
}));
