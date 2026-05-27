import { getQueries } from "../db/init.js";

const CHARS_PER_TOKEN = 4;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "...";
}

export function buildContextPreamble(conversationId: string, tokenBudget: number = 2000): string | undefined {
  const queries = getQueries();
  const sections: string[] = [];
  let tokensUsed = 0;

  const summaryBudget = Math.floor(tokenBudget * 0.25);
  const pinnedBudget = Math.floor(tokenBudget * 0.5);
  const recentBudget = Math.floor(tokenBudget * 0.25);

  // 1. Latest conversation summary
  const summary = queries.getLatestSummary(conversationId);
  if (summary) {
    const content = truncateToTokens(summary.content, summaryBudget);
    sections.push(`## Previous Work Summary\n${content}`);
    tokensUsed += estimateTokens(content) + 10;
  }

  // 2. Pinned messages
  const pins = queries.getPinnedMessages(conversationId);
  if (pins.length > 0) {
    const pinContents: string[] = [];
    let pinTokens = 0;

    for (const pin of pins) {
      const events = queries.getEvents(conversationId, pin.event_sequence_number - 1, 1);
      if (events.length === 0) continue;

      try {
        const event = JSON.parse(events[0].payload);
        if (event.type === "message" && event.content) {
          const content = truncateToTokens(event.content, 200);
          const tokens = estimateTokens(content);
          if (pinTokens + tokens > pinnedBudget) break;
          pinContents.push(`- ${content}`);
          pinTokens += tokens;
        }
      } catch { /* skip malformed events */ }
    }

    if (pinContents.length > 0) {
      sections.push(`## Pinned Context\n${pinContents.join("\n")}`);
      tokensUsed += pinTokens + 10;
    }
  }

  // 3. Recent message history
  const allEvents = queries.getEvents(conversationId, 0, 1000);
  const messageEvents = allEvents
    .filter((e) => {
      try {
        const p = JSON.parse(e.payload);
        return p.type === "message" && p.final === true && !p.streaming;
      } catch { return false; }
    })
    .slice(-8);

  if (messageEvents.length > 0) {
    const recentLines: string[] = [];
    let recentTokens = 0;

    for (const ev of messageEvents) {
      try {
        const event = JSON.parse(ev.payload);
        const role = event.role === "user" ? "User" : "Assistant";
        const content = truncateToTokens(event.content, 100);
        const line = `${role}: ${content}`;
        const tokens = estimateTokens(line);
        if (recentTokens + tokens > recentBudget) break;
        recentLines.push(line);
        recentTokens += tokens;
      } catch { /* skip */ }
    }

    if (recentLines.length > 0) {
      sections.push(`## Recent Exchange\n${recentLines.join("\n")}`);
      tokensUsed += recentTokens + 10;
    }
  }

  if (sections.length === 0) return undefined;

  return `# Conversation Context\n\n${sections.join("\n\n")}`;
}
