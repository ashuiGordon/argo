import { Hono } from "hono";
import { getQueries } from "../db/init.js";
import type { Env } from "./types.js";

export const pinRoutes = new Hono<Env>();

pinRoutes.post("/:conversationId/messages/:sequence/pin", (c) => {
  const { conversationId, sequence } = c.req.param();
  const userId = c.get("userId");
  const queries = getQueries();
  queries.pinMessage(conversationId, Number(sequence), userId);
  return c.json({ pinned: true });
});

pinRoutes.delete("/:conversationId/messages/:sequence/pin", (c) => {
  const { conversationId, sequence } = c.req.param();
  const queries = getQueries();
  queries.unpinMessage(conversationId, Number(sequence));
  return c.json({ pinned: false });
});

pinRoutes.get("/:conversationId/pins", (c) => {
  const { conversationId } = c.req.param();
  const queries = getQueries();
  const pins = queries.getPinnedMessages(conversationId);
  return c.json({ pins });
});
