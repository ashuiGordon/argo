import type { NormalizedEvent } from "@argo/shared";

export interface CodexJsonRpcRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

export interface CodexJsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export interface CodexJsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
}

export type CodexJsonRpcMessage = CodexJsonRpcResponse | CodexJsonRpcNotification;

export function parseJsonRpcLine(
  sessionId: string,
  line: string,
): NormalizedEvent | null {
  try {
    const msg: CodexJsonRpcMessage = JSON.parse(line);

    if (!("jsonrpc" in msg) || msg.jsonrpc !== "2.0") return null;

    if ("method" in msg) {
      return handleNotification(sessionId, msg as CodexJsonRpcNotification);
    }

    if ("id" in msg) {
      return handleResponse(sessionId, msg as CodexJsonRpcResponse);
    }

    return null;
  } catch {
    return null;
  }
}

function handleNotification(
  sessionId: string,
  msg: CodexJsonRpcNotification,
): NormalizedEvent | null {
  switch (msg.method) {
    case "output":
    case "response":
      return {
        type: "message",
        sessionId,
        role: "assistant",
        content: (msg.params?.text as string) || (msg.params?.content as string) || "",
        streaming: msg.params?.streaming === true,
        final: msg.params?.final !== false,
      };

    case "tool_call":
      return {
        type: "tool_use",
        sessionId,
        tool: (msg.params?.name as string) || "unknown",
        input: (msg.params?.arguments as Record<string, unknown>) || {},
      };

    case "tool_result":
      return {
        type: "tool_result",
        sessionId,
        tool: (msg.params?.name as string) || "unknown",
        output: (msg.params?.output as string) || "",
        success: msg.params?.success !== false,
      };

    case "approval_required":
      return {
        type: "approval_request",
        sessionId,
        approvalId: (msg.params?.id as string) || "",
        action: (msg.params?.action as string) || "",
        riskLevel: (msg.params?.risk_level as "critical" | "high" | "medium" | "low") || "medium",
        toolName: (msg.params?.tool_name as string) || "",
        proposedAction: (msg.params?.proposed_action as Record<string, unknown>) || {},
      };

    case "error":
      return {
        type: "error",
        sessionId,
        message: (msg.params?.message as string) || "Codex error",
        code: (msg.params?.code as string) || "CODEX_RPC_ERROR",
        recoverable: msg.params?.recoverable !== false,
      };

    default:
      return null;
  }
}

function handleResponse(
  sessionId: string,
  msg: CodexJsonRpcResponse,
): NormalizedEvent | null {
  if (msg.error) {
    return {
      type: "error",
      sessionId,
      message: msg.error.message,
      code: `CODEX_RPC_${msg.error.code}`,
      recoverable: true,
    };
  }

  if (msg.result && typeof msg.result === "object" && "content" in msg.result) {
    return {
      type: "message",
      sessionId,
      role: "assistant",
      content: (msg.result as { content: string }).content,
      streaming: false,
      final: true,
    };
  }

  return null;
}

export function createJsonRpcRequest(
  id: number,
  method: string,
  params?: Record<string, unknown>,
): string {
  const msg: CodexJsonRpcRequest = { jsonrpc: "2.0", id, method, params };
  return JSON.stringify(msg) + "\n";
}

export function createApprovalResponse(id: number, approved: boolean): string {
  return createJsonRpcRequest(id, "approval_decision", { approved });
}
