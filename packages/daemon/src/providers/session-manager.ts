import { getQueries } from "../db/init.js";
import { EventPersistence } from "../event-bus/persist.js";
import { spawnClaudeCode } from "./claude/adapter.js";
import { spawnCodex } from "./codex/adapter.js";
import { getCoordinator } from "../orchestrator/coordinator.js";
import { decompose } from "../orchestrator/decomposer.js";
import { createTaskExecutor } from "../orchestrator/task-executor.js";
import type { NormalizedEvent } from "@argo/shared";
import { randomUUID } from "node:crypto";

export class SessionManager {
  private persistence: EventPersistence;

  constructor() {
    this.persistence = new EventPersistence(getQueries());
  }

  async sendMessage(conversationId: string, content: string): Promise<string> {
    const queries = getQueries();
    const conversation = queries.getConversation(conversationId);
    const agents = queries.getConversationAgents(conversationId);
    if (agents.length === 0) {
      throw new Error("No agents in conversation");
    }

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

    if (conversation?.mode === "group" && agents.length > 1) {
      return this.handleGroupChat(conversationId, sessionId, content, agents);
    }

    return this.handleSingleAgent(conversationId, content, agents[0]);
  }

  private async handleGroupChat(
    conversationId: string,
    sessionId: string,
    content: string,
    agents: Array<{ id: string; name: string; type: string; system_prompt: string | null }>,
  ): Promise<string> {
    const coordinator = getCoordinator();
    const plan = decompose(content, agents);
    const executor = createTaskExecutor(conversationId, agents, process.cwd());

    coordinator.execute(conversationId, sessionId, plan, executor);

    return sessionId;
  }

  private handleSingleAgent(
    conversationId: string,
    content: string,
    agent: { id: string; name: string; type: string; system_prompt: string | null },
  ): string {
    if (agent.type === "claude_code" || agent.type === "custom") {
      const session = spawnClaudeCode(conversationId, content, process.cwd(), agent.system_prompt || undefined);
      return session.sessionId;
    }

    if (agent.type === "codex") {
      const session = spawnCodex(conversationId, content, process.cwd());
      return session.sessionId;
    }

    const sessionId = randomUUID();
    const queries = getQueries();
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
