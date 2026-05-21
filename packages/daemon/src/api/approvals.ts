import { Hono } from "hono";
import { ApprovalDecisionRequest, AlwaysAllowRequest } from "@argo/shared";
import { getQueries } from "../db/init.js";
import { getApprovalQueue } from "../approval/queue.js";
import type { Env } from "./types.js";

export const approvalRoutes = new Hono<Env>();

approvalRoutes.post("/:id/decide", async (c) => {
  const approvalId = c.req.param("id");
  const body = await c.req.json();
  const parsed = ApprovalDecisionRequest.parse(body);

  const queue = getApprovalQueue();
  if (queue.hasPending(approvalId)) {
    queue.resolveApproval(approvalId, parsed.decision);
  } else {
    const queries = getQueries();
    queries.resolveApproval(approvalId, parsed.decision === "approve" ? "approved" : "denied");
  }

  return c.json({
    approvalId,
    status: parsed.decision === "approve" ? "approved" : "denied",
    decidedAt: new Date().toISOString(),
  });
});

approvalRoutes.get("/pending", (c) => {
  const queries = getQueries();
  const pending = queries.getPendingApprovals();
  return c.json({ approvals: pending });
});

approvalRoutes.post("/always-allow", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const parsed = AlwaysAllowRequest.parse(body);
  const queries = getQueries();
  queries.createAlwaysAllowRule(userId, parsed.toolName, parsed.pattern);
  return c.json({ ok: true }, 201);
});
