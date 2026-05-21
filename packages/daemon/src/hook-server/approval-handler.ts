import { getApprovalQueue } from "../approval/queue.js";
import { classifyRisk } from "../approval/risk-classifier.js";

export async function handleApprovalHook(
  sessionId: string,
  conversationId: string,
  toolName: string,
  input: Record<string, unknown>,
  affectedPaths?: string[],
): Promise<"approve" | "deny"> {
  const riskLevel = classifyRisk(toolName, input);

  if (riskLevel === "low") {
    return "approve";
  }

  const queue = getApprovalQueue();
  return queue.requestApproval(
    sessionId,
    conversationId,
    toolName,
    riskLevel,
    input,
    affectedPaths,
  );
}
