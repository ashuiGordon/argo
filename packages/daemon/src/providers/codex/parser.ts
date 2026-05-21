import type { NormalizedEvent } from "@argo/shared";

export function parseCodexMessage(sessionId: string, line: string): NormalizedEvent | null {
  try {
    const data = JSON.parse(line);

    if (data.type === "message" || data.type === "response") {
      return {
        type: "message",
        sessionId,
        role: "assistant",
        content: data.content || data.message || data.text || "",
        streaming: !!data.streaming,
        final: data.final !== false,
      };
    }

    if (data.type === "tool_call" || data.type === "function_call") {
      return {
        type: "tool_use",
        sessionId,
        tool: data.name || data.tool || "unknown",
        input: data.arguments || data.input || {},
      };
    }

    if (data.type === "tool_output" || data.type === "function_output") {
      return {
        type: "tool_result",
        sessionId,
        tool: data.name || data.tool || "unknown",
        output: data.output || "",
        success: data.success !== false,
      };
    }

    if (data.type === "error") {
      return {
        type: "error",
        sessionId,
        message: data.message || "Unknown Codex error",
        code: data.code || "CODEX_ERROR",
        recoverable: true,
      };
    }

    if (data.content && typeof data.content === "string") {
      return {
        type: "message",
        sessionId,
        role: "assistant",
        content: data.content,
        streaming: false,
        final: true,
      };
    }

    return null;
  } catch {
    if (line.trim()) {
      return {
        type: "message",
        sessionId,
        role: "assistant",
        content: line,
        streaming: false,
        final: true,
      };
    }
    return null;
  }
}
