import { Hono } from "hono";
import { getQueries } from "../db/init.js";
import type { Env } from "./types.js";

export const eventRoutes = new Hono<Env>();

eventRoutes.get("/", (c) => {
  const conversationId = c.req.param("id")!;
  const afterSequence = Number(c.req.query("afterSequence") || "0");
  const limit = Number(c.req.query("limit") || "100");
  const queries = getQueries();

  const events = queries.getEvents(conversationId, afterSequence, limit + 1);
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
