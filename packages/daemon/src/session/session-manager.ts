import { getQueries } from "../db/init.js";
import { EventPersistence } from "../event-bus/persist.js";
import { getActiveSessionByConversation, registerActiveSession, unregisterActiveSession, updateSessionStatus } from "./session-store.js";
import { clearPendingApprovalsForSession } from "../approval/dual-channel.js";
import { getCoordinator } from "../orchestrator/coordinator.js";
import { decompose } from "../orchestrator/decomposer.js";
import { createTaskExecutor } from "../orchestrator/task-executor.js";
import type { NormalizedEvent } from "@argo/shared";
import type { AdapterConfig, AdapterCallbacks, ManagedRuntime } from "../adapters/types.js";
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

    const userEvent: NormalizedEvent = {
      type: "message",
      sessionId: randomUUID(),
      role: "user",
      content,
      streaming: false,
      final: true,
    };
    this.persistence.persist(userEvent, conversationId);

    if (conversation?.mode === "group" && agents.length > 1) {
      return this.handleGroupChat(conversationId, content, agents);
    }

    return this.handleSingleAgent(conversationId, content, agents[0]);
  }

  private async handleGroupChat(
    conversationId: string,
    content: string,
    agents: Array<{ id: string; name: string; type: string; system_prompt: string | null }>,
  ): Promise<string> {
    const sessionId = randomUUID();
    const coordinator = getCoordinator();
    const plan = decompose(content, agents);
    const executor = createTaskExecutor(conversationId, agents, process.cwd());
    coordinator.execute(conversationId, sessionId, plan, executor);
    return sessionId;
  }

  private async handleSingleAgent(
    conversationId: string,
    content: string,
    agent: { id: string; name: string; type: string; system_prompt: string | null },
  ): Promise<string> {
    const provider = agent.type === "codex" ? "codex" as const : "claude_code" as const;

    // Check for existing active session
    const existing = getActiveSessionByConversation(conversationId, provider);
    if (existing && existing.runtime.isActive()) {
      await existing.runtime.sendMessage(content);
      return existing.sessionId;
    }

    // Spawn new session
    const sessionId = randomUUID();
    const queries = getQueries();

    queries.createSession(sessionId, provider, conversationId, process.cwd());
    updateSessionStatus(sessionId, "starting");

    const config: AdapterConfig = {
      workspace: process.cwd(),
      sessionId,
      conversationId,
      mode: "headless",
      systemPrompt: agent.system_prompt || undefined,
    };

    const callbacks: AdapterCallbacks = {
      onEvent: (event) => {
        this.persistence.persist(event, conversationId);
      },
      onExit: (code) => {
        const status = code === 0 ? "stopped" : "crashed";
        updateSessionStatus(sessionId, status);
        clearPendingApprovalsForSession(sessionId);
        unregisterActiveSession(sessionId);
      },
    };

    let runtime: ManagedRuntime;

    if (provider === "claude_code") {
      const { launchClaude } = await import("../adapters/claude/launcher.js");
      runtime = await launchClaude(config, callbacks, content);
    } else {
      const { launchCodex } = await import("../adapters/codex/adapter.js");
      runtime = await launchCodex(config, callbacks, content);
    }

    registerActiveSession(sessionId, conversationId, provider, "headless", runtime);
    updateSessionStatus(sessionId, "running");

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
