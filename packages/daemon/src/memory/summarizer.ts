import { randomUUID } from "node:crypto";
import { getQueries } from "../db/init.js";

const SUMMARIZE_SYSTEM_PROMPT = "Summarize this coding conversation in under 200 tokens. Focus on: what was accomplished, key decisions made, and current state of the work. Be concise and factual.";

interface MessageEntry {
  role: string;
  content: string;
}

export async function summarizeSession(sessionId: string, conversationId: string): Promise<void> {
  const queries = getQueries();
  const rows = queries.getSessionMessages(sessionId);

  const messages: MessageEntry[] = [];
  for (const row of rows) {
    try {
      const event = JSON.parse(row.payload);
      if (event.role && event.content && event.final !== false) {
        messages.push({ role: event.role, content: event.content });
      }
    } catch { /* skip */ }
  }

  if (messages.length < 2) return;

  const transcript = messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content.slice(0, 500)}`)
    .join("\n\n");

  const summary = await generateSummary(transcript);
  if (!summary) return;

  const tokenEstimate = Math.ceil(summary.length / 4);
  queries.addMemory(
    randomUUID(),
    conversationId,
    sessionId,
    "summary",
    summary,
    JSON.stringify({ messageCount: messages.length }),
    tokenEstimate,
  );
}

async function generateSummary(transcript: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return generateFallbackSummary(transcript);
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system: SUMMARIZE_SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Conversation transcript:\n\n${transcript.slice(0, 8000)}` }],
      }),
    });

    if (!response.ok) {
      return generateFallbackSummary(transcript);
    }

    const data = await response.json() as { content: Array<{ type: string; text: string }> };
    const text = data.content?.find((b) => b.type === "text")?.text;
    return text || generateFallbackSummary(transcript);
  } catch {
    return generateFallbackSummary(transcript);
  }
}

function generateFallbackSummary(transcript: string): string {
  const lines = transcript.split("\n\n");
  const firstUser = lines.find((l) => l.startsWith("User:"));
  const lastAssistant = [...lines].reverse().find((l) => l.startsWith("Assistant:"));
  const turnCount = lines.length;

  const parts: string[] = [];
  if (firstUser) parts.push(firstUser.slice(0, 200));
  parts.push(`(${turnCount} turns total)`);
  if (lastAssistant) parts.push(`Last: ${lastAssistant.slice(0, 200)}`);

  return parts.join(" | ");
}
