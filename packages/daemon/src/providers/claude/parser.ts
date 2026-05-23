import type { NormalizedEvent } from "@argo/shared";
import { randomUUID } from "node:crypto";

export function parseHookEvent(sessionId: string, raw: unknown): NormalizedEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;

  const type = data.type as string;

  switch (type) {
    case "assistant_message":
    case "message":
      return {
        type: "message",
        sessionId,
        role: "assistant",
        content: (data.content as string) || (data.message as string) || "",
        streaming: !!data.streaming,
        final: data.final !== false,
      };

    case "tool_use":
      return {
        type: "tool_use",
        sessionId,
        tool: (data.tool as string) || (data.name as string) || "unknown",
        input: (data.input as Record<string, unknown>) || {},
      };

    case "tool_result":
      return {
        type: "tool_result",
        sessionId,
        tool: (data.tool as string) || (data.name as string) || "unknown",
        output: (data.output as string) || (data.result as string) || "",
        success: data.success !== false,
      };

    case "approval_request": {
      const approvalId = (data.approvalId as string) || randomUUID();
      return {
        type: "approval_request",
        sessionId,
        approvalId,
        action: (data.action as string) || "",
        riskLevel: (data.riskLevel as "critical" | "high" | "medium" | "low") || "medium",
        toolName: (data.toolName as string) || (data.tool as string) || "unknown",
        proposedAction: (data.proposedAction as Record<string, unknown>) || {},
        affectedPaths: data.affectedPaths as string[] | undefined,
      };
    }

    case "error":
      return {
        type: "error",
        sessionId,
        message: (data.message as string) || "Unknown error",
        code: (data.code as string) || "UNKNOWN",
        recoverable: data.recoverable !== false,
      };

    case "usage":
      return {
        type: "usage",
        sessionId,
        inputTokens: (data.inputTokens as number) || 0,
        outputTokens: (data.outputTokens as number) || 0,
        cacheReadTokens: data.cacheReadTokens as number | undefined,
        cacheWriteTokens: data.cacheWriteTokens as number | undefined,
      };

    default:
      return null;
  }
}

/**
 * Parse Claude Code stream-json format into NormalizedEvents.
 * Claude outputs: {type:"system"}, {type:"assistant", message:{content:[...]}}, {type:"result"}
 */
export function parseStreamJsonLine(sessionId: string, line: string): NormalizedEvent | null {
  try {
    const data = JSON.parse(line);
    return parseStreamJsonEvent(sessionId, data);
  } catch {
    return null;
  }
}

function parseStreamJsonEvent(sessionId: string, data: Record<string, unknown>): NormalizedEvent | null {
  const type = data.type as string;

  switch (type) {
    case "assistant": {
      const msg = data.message as Record<string, unknown> | undefined;
      if (!msg) return null;
      const content = msg.content as Array<Record<string, unknown>> | undefined;
      if (!content || content.length === 0) return null;

      for (const block of content) {
        if (block.type === "tool_use") {
          return {
            type: "tool_use",
            sessionId,
            tool: (block.name as string) || "unknown",
            input: (block.input as Record<string, unknown>) || {},
          };
        }
      }

      // Text messages come via the "result" event to avoid duplicates
      return null;
    }

    case "result": {
      const result = data.result as string | undefined;
      if (result) {
        return {
          type: "message",
          sessionId,
          role: "assistant",
          content: result,
          streaming: false,
          final: true,
        };
      }
      return null;
    }

    case "system":
      return null;

    default:
      return parseHookEvent(sessionId, data);
  }
}
