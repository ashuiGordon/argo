import { Hono } from "hono";
import { ApprovalDecisionRequest, AlwaysAllowRequest } from "@argo/shared";
import { getQueries } from "../db/init.js";
import { getApprovalQueue } from "../approval/queue.js";
import { resolveApproval, getPendingApprovalsForSession } from "../approval/dual-channel.js";
import type { Env } from "./types.js";

export const approvalRoutes = new Hono<Env>();

approvalRoutes.post("/:id/decide", async (c) => {
  const approvalId = c.req.param("id");
  const body = await c.req.json();
  const parsed = ApprovalDecisionRequest.parse(body);

  const decision = parsed.decision === "approve" ? "approve" as const : "deny" as const;

  // Try dual-channel resolver first (new system)
  const resolved = resolveApproval(approvalId, decision, "web_ui");

  if (!resolved) {
    // Fallback to legacy queue
    const queue = getApprovalQueue();
    if (queue.hasPending(approvalId)) {
      queue.resolveApproval(approvalId, parsed.decision);
    } else {
      const queries = getQueries();
      queries.resolveApproval(approvalId, parsed.decision === "approve" ? "approved" : "denied");
    }
  }

  return c.json({
    approvalId,
    decision: parsed.decision,
    resolvedBy: "web_ui",
    decidedAt: new Date().toISOString(),
  });
});

approvalRoutes.get("/pending", (c) => {
  const queries = getQueries();
  const pending = queries.getPendingApprovals();

  const approvals = (pending as Array<Record<string, unknown>>).map((a) => ({
    approvalId: a.approval_id,
    sessionId: a.session_id,
    conversationId: a.conversation_id,
    toolName: a.action_type,
    riskLevel: a.risk_level,
    proposedAction: typeof a.proposed_action === "string" ? JSON.parse(a.proposed_action as string) : a.proposed_action,
    affectedPaths: a.affected_paths ? (typeof a.affected_paths === "string" ? JSON.parse(a.affected_paths as string) : a.affected_paths) : [],
    status: a.status,
    createdAt: a.created_at,
  }));

  return c.json({ approvals });
});

approvalRoutes.post("/always-allow", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const parsed = AlwaysAllowRequest.parse(body);
  const queries = getQueries();
  queries.createAlwaysAllowRule(userId, parsed.toolName, parsed.pattern);
  return c.json({ ok: true }, 201);
});
