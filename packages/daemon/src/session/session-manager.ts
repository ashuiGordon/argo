import { getQueries } from "../db/init.js";
import { EventPersistence } from "../event-bus/persist.js";
import { getActiveSessionByConversation, registerActiveSession, unregisterActiveSession, updateSessionStatus } from "./session-store.js";
import { clearPendingApprovalsForSession } from "../approval/dual-channel.js";
import { runGroupChat } from "../orchestrator/group-chat.js";
import { getPreset } from "../orchestrator/team-presets.js";
import { broadcastToConversation } from "../ws/index.js";
import type { NormalizedEvent, McpServerConfig, SkillConfig } from "@argo/shared";
import type { AdapterConfig, AdapterCallbacks, ManagedRuntime } from "../adapters/types.js";
import { randomUUID } from "node:crypto";

interface AgentWithConfig {
  id: string;
  name: string;
  type: string;
  system_prompt: string | null;
  config: string;
}

function parseAgentConfig(agent: AgentWithConfig): { mcpServers?: McpServerConfig[]; skills?: SkillConfig[] } {
  try {
    const config = JSON.parse(agent.config || "{}");
    return {
      mcpServers: Array.isArray(config.mcpServers) ? config.mcpServers : undefined,
      skills: Array.isArray(config.skills) ? config.skills : undefined,
    };
  } catch {
    return {};
  }
}

export class SessionManager {
  private persistence: EventPersistence;

  constructor() {
    this.persistence = new EventPersistence(getQueries());
  }

  async sendMessage(
    conversationId: string,
    content: string,
    options: { workspace?: string } = {},
  ): Promise<string> {
    const { workspace } = options;
    const queries = getQueries();
    const conversation = queries.getConversation(conversationId);
    const agents = queries.getConversationAgents(conversationId);
    if (agents.length === 0) {
      throw new Error("No agents in conversation");
    }

    const resolvedWorkspace = workspace || conversation?.workspace || process.cwd();

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
      return this.handleGroupChat(conversationId, content, agents, resolvedWorkspace);
    }

    return this.handleSingleAgent(conversationId, content, agents[0], resolvedWorkspace);
  }

  private async handleGroupChat(
    conversationId: string,
    content: string,
    agents: AgentWithConfig[],
    workspace: string,
  ): Promise<string> {
    const sessionId = randomUUID();
    const queries = getQueries();
    const conversation = queries.getConversation(conversationId);

    // Find the moderator agent
    const moderatorAgentId = conversation?.moderator_agent_id;
    const moderator = moderatorAgentId
      ? agents.find((a) => a.id === moderatorAgentId)
      : agents[0];

    if (!moderator) {
      throw new Error("No moderator agent found for group chat");
    }

    // Resolve team preset if set
    const presetId = queries.getTeamPreset(conversationId);
    const teamPreset = presetId ? getPreset(presetId) : undefined;

    runGroupChat(conversationId, sessionId, content, agents, moderator, workspace, teamPreset);
    return sessionId;
  }

  private async handleSingleAgent(
    conversationId: string,
    content: string,
    agent: AgentWithConfig,
    workspace: string,
  ): Promise<string> {
    const provider = agent.type === "codex" ? "codex" as const : "claude_code" as const;

    // Check for existing active session
    const existing = getActiveSessionByConversation(conversationId, provider);
    if (existing && existing.runtime.isActive()) {
      await existing.runtime.sendMessage(content);
      return existing.sessionId;
    }

    // Check for a resumable session in DB
    const queries = getQueries();
    const dbSession = queries.getDb()
      .prepare("SELECT session_id, status FROM sessions WHERE conversation_id = ? AND provider = ? ORDER BY created_at DESC LIMIT 1")
      .get(conversationId, provider) as { session_id: string; status: string } | undefined;

    const resumeSessionId = dbSession && (dbSession.status === "stopped" || dbSession.status === "crashed")
      ? dbSession.session_id
      : undefined;

    // Spawn new session
    const sessionId = randomUUID();
    const { mcpServers, skills } = parseAgentConfig(agent);

    // Build context preamble (only for new sessions, not resume)
    let contextPreamble: string | undefined;
    if (!resumeSessionId) {
      const { buildContextPreamble } = await import("../memory/context-builder.js");
      contextPreamble = buildContextPreamble(conversationId, 2000);
    }

    queries.createSession(sessionId, provider, conversationId, workspace);
    updateSessionStatus(sessionId, "starting");

    const config: AdapterConfig = {
      workspace,
      sessionId,
      conversationId,
      systemPrompt: agent.system_prompt || undefined,
      resumeSessionId,
      mcpServers,
      skills,
      contextPreamble,
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
        import("../memory/summarizer.js").then(({ summarizeSession }) =>
          summarizeSession(sessionId, conversationId).catch(() => {})
        ).catch(() => {});
      },
    };

    let runtime: ManagedRuntime;

    if (provider === "claude_code") {
      const { launchClaudeSdk } = await import("../adapters/claude/sdk-launcher.js");
      runtime = await launchClaudeSdk(config, callbacks, content);
    } else {
      const { launchCodexSdk } = await import("../adapters/codex/sdk-launcher.js");
      runtime = await launchCodexSdk(config, callbacks, content);
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
