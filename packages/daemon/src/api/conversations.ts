import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { CreateConversationRequest, UpdateConversationRequest, PaginationQuery } from "@argo/shared";
import { getQueries } from "../db/init.js";
import type { Env } from "./types.js";

export const conversationRoutes = new Hono<Env>();

conversationRoutes.get("/", (c) => {
  const userId = c.get("userId");
  const query = PaginationQuery.parse(c.req.query());
  const queries = getQueries();

  const conversations = queries.getConversations(userId, query.page, query.limit, query.search);
  const total = queries.getConversationCount(userId, query.search);

  const results = conversations.map((conv) => {
    const agents = queries.getConversationAgents(conv.id);
    const lastEvent = queries.getLastEvent(conv.id);
    let lastMessage: { content: string; timestamp: string } | undefined;
    if (lastEvent && lastEvent.type === "message") {
      const payload = JSON.parse(lastEvent.payload);
      lastMessage = { content: payload.content, timestamp: lastEvent.timestamp };
    }
    return {
      id: conv.id,
      title: conv.title,
      mode: conv.mode,
      workspace: conv.workspace || null,
      pinned: !!conv.pinned,
      archived: !!conv.archived,
      agents: agents.map((a) => ({ id: a.id, name: a.name, type: a.type, avatarColor: a.avatar_color, avatarUrl: a.avatar_url || undefined, role: a.role || undefined })),
      lastMessage,
      unreadCount: queries.getUnreadCount(userId, conv.id),
      updatedAt: conv.updated_at,
    };
  });

  return c.json({ conversations: results, total, page: query.page, limit: query.limit });
});

conversationRoutes.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const parsed = CreateConversationRequest.parse(body);
  const queries = getQueries();

  const id = randomUUID();
  const agents = parsed.agentIds.map((aid) => queries.getAgentById(aid)).filter(Boolean);
  const title = parsed.title || agents.map((a) => a!.name).join(", ") || "New Chat";

  queries.createConversation(id, userId, title, parsed.mode, parsed.workspace, parsed.moderatorAgentId);
  for (const agentId of parsed.agentIds) {
    queries.addConversationAgent(id, agentId);
  }

  if (parsed.teamPresetId) {
    queries.updateTeamPreset(id, parsed.teamPresetId);
  }

  const convAgents = queries.getConversationAgents(id);
  return c.json(
    {
      id,
      title,
      mode: parsed.mode,
      moderatorAgentId: parsed.moderatorAgentId,
      teamPresetId: parsed.teamPresetId,
      agents: convAgents.map((a) => ({ id: a.id, name: a.name, type: a.type, avatarColor: a.avatar_color, role: a.role || undefined })),
    },
    201,
  );
});

conversationRoutes.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const queries = getQueries();

  const conv = queries.getConversation(id);
  if (!conv || conv.user_id !== userId) {
    return c.json({ error: { code: "NOT_FOUND", message: "Conversation not found" } }, 404);
  }

  const body = await c.req.json();
  const parsed = UpdateConversationRequest.parse(body);
  queries.updateConversation(id, parsed);
  return c.json({ id, ...parsed });
});

conversationRoutes.delete("/:id", (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const queries = getQueries();

  const conv = queries.getConversation(id);
  if (!conv || conv.user_id !== userId) {
    return c.json({ error: { code: "NOT_FOUND", message: "Conversation not found" } }, 404);
  }

  queries.deleteConversation(id);
  return c.body(null, 204);
});

conversationRoutes.get("/:id/events", (c) => {
  const id = c.req.param("id");
  const afterSequence = Number(c.req.query("afterSequence") || "0");
  const limit = Number(c.req.query("limit") || "100");
  const queries = getQueries();

  const events = queries.getEvents(id, afterSequence, limit + 1);
  const hasMore = events.length > limit;
  if (hasMore) events.pop();

  return c.json({
    events: events.map((e) => ({
      sequence: e.sequence_number,
      type: e.type,
      payload: JSON.parse(e.payload),
      timestamp: e.timestamp,
    })),
    hasMore,
  });
});

conversationRoutes.post("/:id/read", (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const queries = getQueries();

  const lastEvent = queries.getLastEvent(id);
  if (lastEvent) {
    queries.markConversationRead(userId, id, lastEvent.sequence_number);
  }
  return c.json({ ok: true });
});
