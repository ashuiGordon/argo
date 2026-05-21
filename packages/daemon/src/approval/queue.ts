import { randomUUID } from "node:crypto";
import { APPROVAL_TIMEOUT_MS } from "@argo/shared";
import { getQueries } from "../db/init.js";
import { EventPersistence } from "../event-bus/persist.js";
import type { NormalizedEvent } from "@argo/shared";

interface PendingApproval {
  approvalId: string;
  sessionId: string;
  conversationId: string;
  resolve: (decision: "approve" | "deny") => void;
  timer: ReturnType<typeof setTimeout>;
}

const pendingApprovals = new Map<string, PendingApproval>();

export class ApprovalQueue {
  private persistence: EventPersistence;

  constructor() {
    this.persistence = new EventPersistence(getQueries());
  }

  requestApproval(
    sessionId: string,
    conversationId: string,
    toolName: string,
    riskLevel: "critical" | "high" | "medium" | "low",
    proposedAction: Record<string, unknown>,
    affectedPaths?: string[],
  ): Promise<"approve" | "deny"> {
    const approvalId = randomUUID();
    const queries = getQueries();

    queries.createApproval(
      approvalId,
      sessionId,
      conversationId,
      toolName,
      riskLevel,
      proposedAction,
      affectedPaths,
    );

    const event: NormalizedEvent = {
      type: "approval_request",
      sessionId,
      approvalId,
      action: `${toolName}: ${JSON.stringify(proposedAction).slice(0, 100)}`,
      riskLevel,
      toolName,
      proposedAction,
      affectedPaths,
    };
    this.persistence.persist(event, conversationId);

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.resolveApproval(approvalId, "deny", "timeout");
      }, APPROVAL_TIMEOUT_MS);

      pendingApprovals.set(approvalId, {
        approvalId,
        sessionId,
        conversationId,
        resolve,
        timer,
      });
    });
  }

  resolveApproval(approvalId: string, decision: "approve" | "deny", decidedBy: "user" | "timeout" | "auto_rule" = "user") {
    const pending = pendingApprovals.get(approvalId);
    if (!pending) return;

    clearTimeout(pending.timer);
    pendingApprovals.delete(approvalId);

    const queries = getQueries();
    queries.resolveApproval(approvalId, decision === "approve" ? "approved" : "denied");

    const event: NormalizedEvent = {
      type: "approval_resolved",
      sessionId: pending.sessionId,
      approvalId,
      decision,
      decidedBy,
    };
    this.persistence.persist(event, pending.conversationId);

    pending.resolve(decision);
  }

  hasPending(approvalId: string): boolean {
    return pendingApprovals.has(approvalId);
  }
}

let approvalQueue: ApprovalQueue | null = null;

export function getApprovalQueue(): ApprovalQueue {
  if (!approvalQueue) {
    approvalQueue = new ApprovalQueue();
  }
  return approvalQueue;
}
