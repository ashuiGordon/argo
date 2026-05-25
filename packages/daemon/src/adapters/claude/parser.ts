import type { NormalizedEvent } from "@argo/shared";

interface StreamJsonEnvelope {
  type: string;
  [key: string]: unknown;
}

function extractText(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) {
    const parts = value.map(extractText).filter(Boolean);
    return parts.length > 0 ? parts.join("\n") : null;
  }
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.text === "string") return extractText(record.text);
  if (typeof record.content === "string") return extractText(record.content);
  if ("content" in record) return extractText(record.content);
  return null;
}

function toNonNegInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
}

export interface ParsedUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
}

function extractUsage(value: unknown): ParsedUsage | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const u = value as Record<string, unknown>;
  const input = toNonNegInt(u.input_tokens);
  const output = toNonNegInt(u.output_tokens);
  if (input === null || output === null) return null;
  return {
    inputTokens: input,
    outputTokens: output,
    cacheReadInputTokens: toNonNegInt(u.cache_read_input_tokens) ?? 0,
    cacheCreationInputTokens: toNonNegInt(u.cache_creation_input_tokens) ?? 0,
  };
}

export interface ParseResult {
  events: NormalizedEvent[];
  isResult: boolean;
  usage?: ParsedUsage;
  model?: string;
}

export function parseStreamJsonLine(sessionId: string, line: string): ParseResult {
  const trimmed = line.trim();
  if (!trimmed) return { events: [], isResult: false };

  let envelope: StreamJsonEnvelope;
  try {
    envelope = JSON.parse(trimmed);
  } catch {
    return { events: [], isResult: false };
  }

  const events: NormalizedEvent[] = [];
  let isResult = false;
  let usage: ParsedUsage | undefined;
  let model: string | undefined;

  // System init envelope — extract model
  if (envelope.type === "system" && envelope.subtype === "init") {
    if (typeof envelope.model === "string") {
      model = envelope.model;
    }
  }

  // Assistant message (complete)
  if (envelope.type === "assistant") {
    const message = envelope.message as Record<string, unknown> | undefined;
    if (message?.role === "assistant") {
      const text = extractText(message.content);
      if (text) {
        events.push({
          type: "message",
          sessionId,
          role: "assistant",
          content: text,
          streaming: false,
          final: true,
        });
      }
    }
  }

  // Streaming delta
  if (envelope.type === "stream_event") {
    const event = envelope.event as Record<string, unknown> | undefined;
    if (event?.type === "content_block_delta") {
      const delta = event.delta as Record<string, unknown> | undefined;
      if (delta?.type === "text_delta" && typeof delta.text === "string" && delta.text.length > 0) {
        events.push({
          type: "streaming_delta",
          sessionId,
          delta: delta.text,
          blockIndex: typeof event.index === "number" ? event.index : 0,
        });
      }
    }
  }

  // Tool use
  if (envelope.type === "tool_use") {
    const toolName = envelope.name ?? envelope.tool_name;
    if (typeof toolName === "string") {
      events.push({
        type: "tool_use",
        sessionId,
        tool: toolName,
        input: (envelope.input ?? envelope.tool_input ?? {}) as Record<string, unknown>,
      });
    }
  }

  // Tool result
  if (envelope.type === "tool_result") {
    events.push({
      type: "tool_result",
      sessionId,
      tool: (envelope.tool_name ?? envelope.name ?? "unknown") as string,
      output: extractText(envelope.output ?? envelope.content) ?? "",
      success: envelope.is_error !== true,
    });
  }

  // Result envelope — turn complete, extract usage
  if (envelope.type === "result") {
    isResult = true;
    usage = extractUsage(envelope.usage) ?? undefined;
    const text = extractText(envelope.result);
    if (text) {
      events.push({
        type: "message",
        sessionId,
        role: "assistant",
        content: text,
        streaming: false,
        final: true,
      });
    }
  }

  return { events, isResult, usage, model };
}

export function createUserTurnPayload(content: string): string {
  return JSON.stringify({
    type: "user",
    message: {
      role: "user",
      content: [{ type: "text", text: content }],
    },
  });
}
