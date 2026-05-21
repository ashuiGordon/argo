import { randomUUID } from "node:crypto";
import { getQueries } from "../db/init.js";
import { EventPersistence } from "../event-bus/persist.js";
import { spawnClaudeCode } from "./claude/adapter.js";
import { spawnCodex } from "./codex/adapter.js";
import type { NormalizedEvent } from "@argo/shared";

export class SessionManager {
  private persistence: EventPersistence;

  constructor() {
    this.persistence = new EventPersistence(getQueries());
  }

  async sendMessage(conversationId: string, content: string): Promise<string> {
    const queries = getQueries();
    const agents = queries.getConversationAgents(conversationId);
    if (agents.length === 0) {
      throw new Error("No agents in conversation");
    }

    const agent = agents[0];
    const sessionId = randomUUID();

    const userEvent: NormalizedEvent = {
      type: "message",
      sessionId,
      role: "user",
      content,
      streaming: false,
      final: true,
    };
    this.persistence.persist(userEvent, conversationId);

    if (agent.type === "claude_code" || agent.type === "custom") {
      const session = spawnClaudeCode(conversationId, content, process.cwd(), agent.system_prompt || undefined);
      return session.sessionId;
    }

    if (agent.type === "codex") {
      const session = spawnCodex(conversationId, content, process.cwd());
      return session.sessionId;
    }

    queries.createSession(sessionId, agent.type, conversationId, process.cwd());
    queries.updateSessionStatus(sessionId, "running");

    const startEvent: NormalizedEvent = {
      type: "session_start",
      sessionId,
      provider: "claude_code",
      workspace: process.cwd(),
      agentId: agent.id,
      conversationId,
    };
    this.persistence.persist(startEvent, conversationId);

    const endEvent: NormalizedEvent = {
      type: "session_end",
      sessionId,
      exitCode: 0,
    };
    this.persistence.persist(endEvent, conversationId);
    queries.updateSessionStatus(sessionId, "stopped");

    return sessionId;
  }
}

let sessionManager: SessionManager | null = null;

export function getSessionManager(): SessionManager {
  if (!sessionManager) {
    sessionManager = new SessionManager();
  }
  return sessionManager;
}
