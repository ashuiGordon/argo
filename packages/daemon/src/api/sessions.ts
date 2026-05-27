import { Hono } from "hono";
import { getQueries } from "../db/init.js";
import { randomUUID } from "node:crypto";
import { getActiveSession, getAllActiveSessions, updateSessionStatus } from "../session/session-store.js";
import { getSessionManager } from "../session/session-manager.js";
import type { Env } from "./types.js";

export const sessionRoutes = new Hono<Env>();

// List active sessions
sessionRoutes.get("/", (c) => {
  const queries = getQueries();
  const dbSessions = queries.getActiveSessions();
  const activeSessions = getAllActiveSessions();

  const sessions = dbSessions.map((s) => {
    const active = activeSessions.find((a) => a.sessionId === s.session_id);
    return {
      sessionId: s.session_id,
      provider: s.provider,
      status: s.status,
      workspace: s.workspace,
      isActive: !!active,
    };
  });

  return c.json({ sessions });
});

// Create a new session
sessionRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const { conversationId, agentId, workspace } = body as {
    conversationId: string;
    agentId?: string;
    workspace?: string;
  };

  if (!conversationId) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "conversationId required" } }, 400);
  }

  const queries = getQueries();
  const agents = queries.getConversationAgents(conversationId);
  const agent = agentId ? agents.find((a) => a.id === agentId) : agents[0];

  if (!agent) {
    return c.json({ error: { code: "NOT_FOUND", message: "Agent not found in conversation" } }, 404);
  }

  const provider = agent.type === "codex" ? "codex" : "claude_code";
  const sessionId = randomUUID();

  queries.createSession(sessionId, provider, conversationId, workspace || process.cwd());
  updateSessionStatus(sessionId, "starting");

  return c.json({ sessionId, status: "starting", provider }, 201);
});

// Send message to existing session
sessionRoutes.post("/:id/message", async (c) => {
  const sessionId = c.req.param("id");
  const body = await c.req.json();
  const { content } = body as { content: string };

  if (!content?.trim()) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "content required" } }, 400);
  }

  const active = getActiveSession(sessionId);
  if (active && active.runtime.isActive()) {
    await active.runtime.sendMessage(content);
    return c.json({ accepted: true, sessionId });
  }

  // Fallback: find session by conversation and send via session manager
  const queries = getQueries();
  const session = queries.getSession(sessionId);
  if (!session) {
    return c.json({ error: { code: "NOT_FOUND", message: "Session not found" } }, 404);
  }

  const sessionManager = getSessionManager();
  const newSessionId = await sessionManager.sendMessage(session.conversation_id, content);
  return c.json({ accepted: true, sessionId: newSessionId });
});

// Resume a stopped/crashed session
sessionRoutes.post("/:id/resume", async (c) => {
  const sessionId = c.req.param("id");
  const queries = getQueries();
  const session = queries.getSession(sessionId);

  if (!session) {
    return c.json({ error: { code: "NOT_FOUND", message: "Session not found" } }, 404);
  }

  if (session.status === "running") {
    return c.json({ sessionId, status: "running", resumed: false, message: "Already running" });
  }

  const sessionManager = getSessionManager();
  const newSessionId = await sessionManager.sendMessage(session.conversation_id, "");
  updateSessionStatus(sessionId, "stopped");

  return c.json({ sessionId: newSessionId, status: "running", resumed: true });
});

// Get session status and metrics
sessionRoutes.get("/:id/status", (c) => {
  const sessionId = c.req.param("id");
  const queries = getQueries();
  const session = queries.getSession(sessionId);

  if (!session) {
    return c.json({ error: { code: "NOT_FOUND", message: "Session not found" } }, 404);
  }

  const active = getActiveSession(sessionId);
  const db = queries.getDb();
  const extended = db.prepare("SELECT last_activity_at, token_usage_json FROM sessions WHERE session_id = ?").get(sessionId) as {
    last_activity_at?: string;
    token_usage_json?: string;
  } | undefined;

  let tokenUsage = null;
  if (extended?.token_usage_json) {
    try { tokenUsage = JSON.parse(extended.token_usage_json); } catch { /* ignore */ }
  }

  return c.json({
    sessionId,
    status: session.status,
    provider: session.provider,
    isActive: !!active?.runtime.isActive(),
    tokenUsage,
    lastActivityAt: extended?.last_activity_at,
  });
});

// Terminate a session
sessionRoutes.delete("/:id", (c) => {
  const sessionId = c.req.param("id");
  const active = getActiveSession(sessionId);

  if (active && active.runtime.isActive()) {
    active.runtime.terminate();
  }

  updateSessionStatus(sessionId, "stopped");
  return c.body(null, 204);
});
