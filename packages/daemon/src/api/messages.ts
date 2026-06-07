import { Hono } from "hono";
import { SendMessageRequest } from "@argo/shared";
import { getQueries } from "../db/init.js";
import { getSessionManager } from "../session/session-manager.js";
import type { Env } from "./types.js";

export const messageRoutes = new Hono<Env>();

messageRoutes.post("/", async (c) => {
  const conversationId = c.req.param("id")!;
  const body = await c.req.json();
  const parsed = SendMessageRequest.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.issues } },
      400,
    );
  }

  const queries = getQueries();
  const conv = queries.getConversation(conversationId);
  if (!conv) {
    return c.json({ error: { code: "NOT_FOUND", message: "Conversation not found" } }, 404);
  }

  // Auto-set title from first user message if title is still default (agent name)
  const agents = queries.getConversationAgents(conversationId);
  const defaultTitle = agents.map((a: { name: string }) => a.name).join(", ");
  if (conv.title === defaultTitle || conv.title === "New Chat") {
    const msgTitle = parsed.data.content.slice(0, 50).replace(/\n/g, " ");
    queries.updateConversation(conversationId, { title: msgTitle });
  }

  const sessionManager = getSessionManager();
  const sessionId = await sessionManager.sendMessage(conversationId, parsed.data.content, {
    workspace: parsed.data.workspace,
  });

  return c.json({ accepted: true, sessionId }, 202);
});
