import { Hono } from "hono";
import { getQueries } from "../db/init.js";
import { createPtySession, destroyPty } from "../providers/pty-manager.js";
import { randomUUID } from "node:crypto";
import type { Env } from "./types.js";

export const sessionRoutes = new Hono<Env>();

sessionRoutes.get("/", (c) => {
  const queries = getQueries();
  const sessions = queries.getActiveSessions();
  return c.json({
    sessions: sessions.map((s) => ({
      sessionId: s.session_id,
      provider: s.provider,
      status: s.status,
      isExternal: !!s.is_external,
      workspace: s.workspace,
    })),
  });
});

sessionRoutes.post("/pty", async (c) => {
  const conversationId = c.req.query("conversationId");
  if (!conversationId) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "conversationId required" } }, 400);
  }
  try {
    const sessionId = randomUUID();
    createPtySession(sessionId, conversationId, process.cwd());
    return c.json({ sessionId }, 201);
  } catch (err) {
    console.error("PTY creation error:", err);
    return c.json({ error: { code: "PTY_ERROR", message: String(err) } }, 500);
  }
});

sessionRoutes.delete("/pty/:sessionId", (c) => {
  const sessionId = c.req.param("sessionId");
  destroyPty(sessionId);
  return c.json({ ok: true });
});
