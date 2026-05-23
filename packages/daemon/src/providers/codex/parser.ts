import type { NormalizedEvent } from "@argo/shared";

interface CodexEvent {
  type: string;
  thread_id?: string;
  item?: {
    id: string;
    type: string;
    text?: string;
    command?: string;
    aggregated_output?: string;
    exit_code?: number | null;
    status?: string;
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export function parseCodexMessage(sessionId: string, line: string): NormalizedEvent | null {
  try {
    const data: CodexEvent = JSON.parse(line);

    if (data.type === "item.completed" && data.item?.type === "agent_message") {
      return {
        type: "message",
        sessionId,
        role: "assistant",
        content: data.item.text || "",
        streaming: false,
        final: true,
      };
    }

    if (data.type === "item.started" && data.item?.type === "command_execution") {
      return {
        type: "tool_use",
        sessionId,
        tool: "shell",
        input: { command: data.item.command || "" },
      };
    }

    if (data.type === "item.completed" && data.item?.type === "command_execution") {
      return {
        type: "tool_result",
        sessionId,
        tool: "shell",
        output: data.item.aggregated_output || "",
        success: data.item.exit_code === 0,
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
