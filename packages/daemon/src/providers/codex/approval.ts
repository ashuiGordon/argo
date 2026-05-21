import type { ChildProcess } from "node:child_process";
import { getApprovalQueue } from "../../approval/queue.js";
import { classifyRisk } from "../../approval/risk-classifier.js";
import { checkAlwaysAllow } from "../../approval/always-allow.js";
import { createApprovalResponse } from "./protocol.js";

export async function handleCodexApproval(
  proc: ChildProcess,
  sessionId: string,
  conversationId: string,
  requestId: number,
  toolName: string,
  proposedAction: Record<string, unknown>,
  affectedPaths?: string[],
): Promise<void> {
  const riskLevel = classifyRisk(toolName, proposedAction);

  if (riskLevel === "low") {
    sendApprovalDecision(proc, requestId, true);
    return;
  }

  const autoAllowed = checkAlwaysAllow(sessionId, toolName);
  if (autoAllowed) {
    sendApprovalDecision(proc, requestId, true);
    return;
  }

  const queue = getApprovalQueue();
  const decision = await queue.requestApproval(
    sessionId,
    conversationId,
    toolName,
    riskLevel,
    proposedAction,
    affectedPaths,
  );

  sendApprovalDecision(proc, requestId, decision === "approve");
}

function sendApprovalDecision(proc: ChildProcess, requestId: number, approved: boolean): void {
  if (proc.stdin?.writable) {
    proc.stdin.write(createApprovalResponse(requestId, approved));
  }
}
