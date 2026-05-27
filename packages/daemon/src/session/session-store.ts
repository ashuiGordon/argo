import { getQueries } from "../db/init.js";
import type { ManagedRuntime, SessionStatus, ProviderType, TokenUsageSnapshot } from "../adapters/types.js";

interface ActiveSession {
  sessionId: string;
  conversationId: string;
  provider: ProviderType;
  runtime: ManagedRuntime;
}

const activeSessions = new Map<string, ActiveSession>();

export function registerActiveSession(
  sessionId: string,
  conversationId: string,
  provider: ProviderType,
  _mode: string,
  runtime: ManagedRuntime,
): void {
  activeSessions.set(sessionId, { sessionId, conversationId, provider, runtime });
}

export function unregisterActiveSession(sessionId: string): void {
  activeSessions.delete(sessionId);
}

export function getActiveSession(sessionId: string): ActiveSession | undefined {
  return activeSessions.get(sessionId);
}

export function getActiveSessionByConversation(conversationId: string, provider?: ProviderType): ActiveSession | undefined {
  for (const session of activeSessions.values()) {
    if (session.conversationId === conversationId && (!provider || session.provider === provider)) {
      if (session.runtime.isActive()) return session;
    }
  }
  return undefined;
}

export function getAllActiveSessions(): ActiveSession[] {
  return Array.from(activeSessions.values()).filter((s) => s.runtime.isActive());
}

export function updateSessionStatus(sessionId: string, status: SessionStatus): void {
  const queries = getQueries();
  queries.updateSessionStatus(sessionId, status);
}

export function updateSessionTokenUsage(sessionId: string, usage: TokenUsageSnapshot): void {
  const queries = getQueries();
  const db = queries.getDb();
  db.prepare("UPDATE sessions SET token_usage_json = ?, last_activity_at = datetime('now') WHERE session_id = ?")
    .run(JSON.stringify(usage), sessionId);
}

export function markCrashedSessionsOnStartup(): void {
  const queries = getQueries();
  const db = queries.getDb();
  db.prepare("UPDATE sessions SET status = 'crashed' WHERE status IN ('running', 'starting')")
    .run();
}

export function terminateAllSessions(): void {
  for (const session of activeSessions.values()) {
    if (session.runtime.isActive()) {
      session.runtime.terminate();
    }
  }
  activeSessions.clear();
}
