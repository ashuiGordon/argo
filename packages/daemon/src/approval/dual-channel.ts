import { randomUUID } from "node:crypto";
import { getQueries } from "../db/init.js";
import { EventPersistence } from "../event-bus/persist.js";
import type { NormalizedEvent } from "@argo/shared";
import type { ApprovalDecision } from "../adapters/types.js";

const AUTO_DENY_TIMEOUT_MS = 30_000;

interface PendingApproval {
  approvalId: string;
  sessionId: string;
  conversationId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  riskLevel: string;
  affectedPaths: string[];
  reason: string;
  timer: ReturnType<typeof setTimeout>;
  resolve: (decision: ApprovalDecision) => void;
}

const pendingApprovals = new Map<string, PendingApproval>();

export function createApprovalRequest(
  sessionId: string,
  conversationId: string,
  toolName: string,
  toolInput: Record<string, unknown>,
  riskLevel: string,
  affectedPaths: string[],
  reason: string,
): { approvalId: string; promise: Promise<ApprovalDecision> } {
  const approvalId = randomUUID();
  const queries = getQueries();
  const persistence = new EventPersistence(queries);

  queries.createApproval(approvalId, sessionId, conversationId, toolName, riskLevel, toolInput, affectedPaths.length > 0 ? affectedPaths : undefined);

  const approvalEvent: NormalizedEvent = {
    type: "approval_request",
    sessionId,
    approvalId,
    action: `${toolName} execution`,
    riskLevel: riskLevel as "critical" | "high" | "medium" | "low",
    toolName,
    proposedAction: toolInput,
    affectedPaths,
  };
  persistence.persist(approvalEvent, conversationId);

  const promise = new Promise<ApprovalDecision>((resolve) => {
    const timer = setTimeout(() => {
      resolveApproval(approvalId, "deny", "auto_timeout");
    }, AUTO_DENY_TIMEOUT_MS);

    pendingApprovals.set(approvalId, {
      approvalId,
      sessionId,
      conversationId,
      toolName,
      toolInput,
      riskLevel,
      affectedPaths,
      reason,
      timer,
      resolve,
    });
  });

  return { approvalId, promise };
}

export function resolveApproval(
  approvalId: string,
  decision: ApprovalDecision,
  resolvedBy: "web_ui" | "terminal" | "auto_timeout" = "web_ui",
): boolean {
  const pending = pendingApprovals.get(approvalId);
  if (!pending) return false;

  clearTimeout(pending.timer);
  pendingApprovals.delete(approvalId);

  const queries = getQueries();
  const persistence = new EventPersistence(queries);

  queries.resolveApproval(approvalId, decision === "approve" ? "approved" : "denied");

  const resolvedEvent: NormalizedEvent = {
    type: "approval_resolved",
    sessionId: pending.sessionId,
    approvalId,
    decision: decision === "always_allow" ? "approve" : decision,
    decidedBy: resolvedBy === "auto_timeout" ? "timeout" : "user",
  };
  persistence.persist(resolvedEvent, pending.conversationId);

  pending.resolve(decision);
  return true;
}

export function getPendingApproval(approvalId: string): PendingApproval | undefined {
  return pendingApprovals.get(approvalId);
}

export function getPendingApprovalsForSession(sessionId: string): PendingApproval[] {
  return Array.from(pendingApprovals.values()).filter((a) => a.sessionId === sessionId);
}

export function clearPendingApprovalsForSession(sessionId: string): void {
  for (const [id, approval] of pendingApprovals.entries()) {
    if (approval.sessionId === sessionId) {
      clearTimeout(approval.timer);
      approval.resolve("deny");
      pendingApprovals.delete(id);
    }
  }
}
