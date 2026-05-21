import { Hono } from "hono";
import { getQueries } from "../db/init.js";

export const sessionRoutes = new Hono();

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
