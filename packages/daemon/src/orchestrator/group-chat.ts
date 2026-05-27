import { randomUUID } from "node:crypto";
import type { NormalizedEvent } from "@argo/shared";
import type { AdapterConfig, AdapterCallbacks, ManagedRuntime } from "../adapters/types.js";
import { EventPersistence } from "../event-bus/persist.js";
import { getQueries } from "../db/init.js";
import { Semaphore } from "./semaphore.js";
import { MAX_PARALLEL_TASKS } from "@argo/shared";
import { MODERATOR_SYSTEM_PROMPT, PARTICIPANT_REQUEST_PROMPT, SYNTHESIS_PROMPT } from "./group-chat-prompts.js";
import { getWorktreeManager, type WorktreeInfo } from "../worktree/manager.js";
import { isGitRepo } from "../worktree/utils.js";

interface AgentWithConfig {
  id: string;
  name: string;
  type: string;
  system_prompt: string | null;
  config: string;
}

interface ChatLogEntry {
  from: string;
  content: string;
  timestamp: number;
}

interface GroupChatState {
  conversationId: string;
  sessionId: string;
  workspace: string;
  agents: AgentWithConfig[];
  moderator: AgentWithConfig;
  chatLog: ChatLogEntry[];
  maxRounds: number;
  currentRound: number;
}

const MAX_ROUNDS = 3;
const PARTICIPANT_TIMEOUT_MS = 120_000;

export async function runGroupChat(
  conversationId: string,
  sessionId: string,
  message: string,
  agents: AgentWithConfig[],
  moderator: AgentWithConfig,
  workspace: string,
): Promise<void> {
  const persistence = new EventPersistence(getQueries());

  const state: GroupChatState = {
    conversationId,
    sessionId,
    workspace,
    agents,
    moderator,
    chatLog: [],
    maxRounds: MAX_ROUNDS,
    currentRound: 0,
  };

  // Load recent history from persisted events
  const queries = getQueries();
  const existingEvents = queries.getEvents(conversationId, 0, 50);
  for (const evt of existingEvents) {
    try {
      const payload = JSON.parse(evt.payload);
      if (payload.type === "message") {
        state.chatLog.push({
          from: payload.role === "user" ? "user" : (payload.agentName || "assistant"),
          content: payload.content,
          timestamp: new Date(evt.timestamp).getTime(),
        });
      }
    } catch { /* skip malformed */ }
  }

  // Add the current user message to log
  state.chatLog.push({ from: "user", content: message, timestamp: Date.now() });

  // Check if user explicitly @mentioned agents — direct routing, skip Moderator
  const userMentions = extractMentions(message, state.agents);
  if (userMentions.length > 0) {
    emitState(persistence, state, "agents_working", userMentions);
    await spawnParticipants(state, userMentions, message, persistence);

    // After agents respond, run synthesis to aggregate
    emitState(persistence, state, "synthesizing");
    const synthesisOutput = await runSynthesisRound(state, persistence);
    if (synthesisOutput) {
      state.chatLog.push({ from: "moderator", content: synthesisOutput, timestamp: Date.now() });
    }
    emitState(persistence, state, "idle");
    return;
  }

  // No user @mentions — Moderator decides routing
  emitState(persistence, state, "moderator_thinking");

  // Run moderator round
  const moderatorOutput = await runModeratorRound(state, message, persistence);

  if (!moderatorOutput) {
    emitState(persistence, state, "idle");
    return;
  }

  // Log moderator response
  state.chatLog.push({ from: "moderator", content: moderatorOutput, timestamp: Date.now() });

  // Check for @mentions
  const mentions = extractMentions(moderatorOutput, state.agents);

  if (mentions.length === 0) {
    // Moderator answered directly — done
    emitState(persistence, state, "idle");
    return;
  }

  // Loop: spawn participants → synthesis → check for more @mentions
  let currentMentions = mentions;
  let currentModeratorMessage = moderatorOutput;

  while (state.currentRound < state.maxRounds && currentMentions.length > 0) {
    state.currentRound++;

    // Spawn mentioned participants
    emitState(persistence, state, "agents_working", currentMentions);
    await spawnParticipants(state, currentMentions, currentModeratorMessage, persistence);

    // Synthesis round
    emitState(persistence, state, "synthesizing");
    const synthesisOutput = await runSynthesisRound(state, persistence);

    if (!synthesisOutput) {
      break;
    }

    state.chatLog.push({ from: "moderator", content: synthesisOutput, timestamp: Date.now() });

    // Check if synthesis has more @mentions
    currentMentions = extractMentions(synthesisOutput, state.agents);
    currentModeratorMessage = synthesisOutput;

    if (currentMentions.length === 0) {
      // Final answer — done
      break;
    }
  }

  emitState(persistence, state, "idle");
}

async function runModeratorRound(
  state: GroupChatState,
  userMessage: string,
  persistence: EventPersistence,
): Promise<string> {
  const prompt = buildModeratorPrompt(state);

  const config: AdapterConfig = {
    workspace: state.workspace,
    sessionId: randomUUID(),
    conversationId: state.conversationId,
    systemPrompt: prompt,
    permissionMode: "trust",
    maxTurns: 2,
  };

  return runOneShot(config, userMessage, persistence, state.conversationId, "moderator");
}

async function runSynthesisRound(
  state: GroupChatState,
  persistence: EventPersistence,
): Promise<string> {
  const prompt = buildSynthesisPrompt(state);

  const config: AdapterConfig = {
    workspace: state.workspace,
    sessionId: randomUUID(),
    conversationId: state.conversationId,
    systemPrompt: prompt,
    permissionMode: "trust",
    maxTurns: 3,
  };

  return runOneShot(config, "Synthesize the agent responses above.", persistence, state.conversationId, "moderator");
}

async function spawnParticipants(
  state: GroupChatState,
  mentions: string[],
  moderatorMessage: string,
  persistence: EventPersistence,
): Promise<void> {
  const semaphore = new Semaphore(MAX_PARALLEL_TASKS);
  const useWorktrees = mentions.length > 1 && isGitRepo(state.workspace);
  const worktreeManager = useWorktrees ? getWorktreeManager() : null;

  const promises = mentions.map(async (agentName) => {
    await semaphore.acquire();
    let worktree: WorktreeInfo | null = null;
    try {
      const agent = state.agents.find((a) => a.name === agentName);
      if (!agent) return;

      let agentWorkspace = state.workspace;

      if (worktreeManager) {
        const agentSessionId = randomUUID();
        worktree = worktreeManager.create({
          workspace: state.workspace,
          sessionId: agentSessionId,
          agentName: agent.name,
          conversationId: state.conversationId,
        });
        agentWorkspace = worktree.path;

        const createdEvent: NormalizedEvent = {
          type: "worktree_created",
          sessionId: state.sessionId,
          agentName: agent.name,
          branch: worktree.branch,
          worktreePath: worktree.path,
        };
        persistence.persist(createdEvent, state.conversationId);
      }

      const prompt = buildParticipantPrompt(agentName, state, moderatorMessage);
      const provider = agent.type === "codex" ? "codex" as const : "claude_code" as const;

      const config: AdapterConfig = {
        workspace: agentWorkspace,
        sessionId: randomUUID(),
        conversationId: state.conversationId,
        systemPrompt: agent.system_prompt || undefined,
        permissionMode: "trust",
      };

      const result = await runAgentWithTimeout(provider, config, prompt, persistence, state.conversationId, agentName);
      state.chatLog.push({ from: agentName, content: result, timestamp: Date.now() });

      // Merge worktree back after agent completes
      if (worktree && worktreeManager) {
        const mergeResult = worktreeManager.merge(worktree.path);
        const mergedEvent: NormalizedEvent = {
          type: "worktree_merged",
          sessionId: state.sessionId,
          agentName: agent.name,
          branch: worktree.branch,
          success: mergeResult.success,
          conflicts: mergeResult.conflicts,
        };
        persistence.persist(mergedEvent, state.conversationId);

        if (!mergeResult.success) {
          state.chatLog.push({
            from: agent.name,
            content: `Merge conflicts in: ${mergeResult.conflicts?.join(", ")}`,
            timestamp: Date.now(),
          });
        }

        worktreeManager.remove(worktree.path);
        worktree = null;
      }
    } finally {
      // Cleanup worktree on failure
      if (worktree && worktreeManager) {
        worktreeManager.remove(worktree.path);
      }
      semaphore.release();
    }
  });

  await Promise.all(promises);
}

async function runOneShot(
  config: AdapterConfig,
  message: string,
  persistence: EventPersistence,
  conversationId: string,
  agentLabel: string,
): Promise<string> {
  console.log(`[group-chat] runOneShot: label=${agentLabel}, msg="${message.slice(0, 80)}", sysprompt_len=${config.systemPrompt?.length || 0}, maxTurns=${config.maxTurns}`);
  return new Promise(async (resolve) => {
    let output = "";

    const callbacks: AdapterCallbacks = {
      onEvent(event) {
        persistence.persist(event, conversationId);
        if (event.type === "message" && "role" in event && event.role === "assistant") {
          output = (event as { content: string }).content;
        }
        if (event.type === "error") {
          console.log(`[group-chat] runOneShot error for ${agentLabel}: ${(event as { message: string }).message}`);
        }
      },
      onExit(code) {
        console.log(`[group-chat] runOneShot exit: label=${agentLabel}, code=${code}, output_len=${output.length}`);
        resolve(output);
      },
    };

    try {
      const { launchClaudeSdk } = await import("../adapters/claude/sdk-launcher.js");
      await launchClaudeSdk(config, callbacks, message);
    } catch (err) {
      console.log(`[group-chat] runOneShot catch: label=${agentLabel}, err=${err}`);
      resolve(output || `[${agentLabel} failed: ${err}]`);
    }
  });
}

async function runAgentWithTimeout(
  provider: "claude_code" | "codex",
  config: AdapterConfig,
  message: string,
  persistence: EventPersistence,
  conversationId: string,
  agentLabel: string,
): Promise<string> {
  return new Promise(async (resolve) => {
    let output = "";
    let runtime: ManagedRuntime | undefined;

    const timeout = setTimeout(() => {
      runtime?.terminate();
      resolve(output || `[${agentLabel} timed out after ${PARTICIPANT_TIMEOUT_MS / 1000}s]`);
    }, PARTICIPANT_TIMEOUT_MS);

    const callbacks: AdapterCallbacks = {
      onEvent(event) {
        persistence.persist(event, conversationId);
        if (event.type === "message" && "role" in event && event.role === "assistant") {
          output = (event as { content: string }).content;
        }
      },
      onExit() {
        clearTimeout(timeout);
        resolve(output || `[${agentLabel} completed with no output]`);
      },
    };

    try {
      if (provider === "claude_code") {
        const { launchClaudeSdk } = await import("../adapters/claude/sdk-launcher.js");
        runtime = await launchClaudeSdk(config, callbacks, message);
      } else {
        const { launchCodexSdk } = await import("../adapters/codex/sdk-launcher.js");
        runtime = await launchCodexSdk(config, callbacks, message);
      }
    } catch (err) {
      clearTimeout(timeout);
      resolve(`[${agentLabel} failed to launch: ${err}]`);
    }
  });
}

function emitState(
  persistence: EventPersistence,
  state: GroupChatState,
  chatState: "moderator_thinking" | "agents_working" | "synthesizing" | "idle",
  activeAgents?: string[],
): void {
  const event: NormalizedEvent = {
    type: "group_chat_state",
    sessionId: state.sessionId,
    state: chatState,
    activeAgents,
    round: state.currentRound,
  };
  persistence.persist(event, state.conversationId);
}

export function extractMentions(text: string, agents: AgentWithConfig[]): string[] {
  const pattern = /@([^\s@:,;!?()\[\]{}'"<>]+)/g;
  const mentions: string[] = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const mentioned = match[1];
    const agent = agents.find((a) => {
      const normalized = a.name.toLowerCase().replace(/\s+/g, "-");
      return a.name.toLowerCase() === mentioned.toLowerCase() || normalized === mentioned.toLowerCase();
    });
    if (agent && !mentions.includes(agent.name)) {
      mentions.push(agent.name);
    }
  }
  return mentions;
}

function buildModeratorPrompt(state: GroupChatState): string {
  const participantList = state.agents
    .map((a) => `- @${a.name.replace(/\s+/g, "-")} (${a.type}): ${a.system_prompt?.slice(0, 100) || "general-purpose agent"}`)
    .join("\n");

  const history = state.chatLog
    .slice(-20)
    .map((e) => `[${e.from}]: ${e.content.slice(0, 500)}`)
    .join("\n");

  return MODERATOR_SYSTEM_PROMPT
    .replace("{{PARTICIPANT_LIST}}", participantList)
    .replace("{{HISTORY}}", history);
}

function buildParticipantPrompt(agentName: string, state: GroupChatState, task: string): string {
  const history = state.chatLog
    .slice(-15)
    .map((e) => `[${e.from}]: ${e.content.slice(0, 500)}`)
    .join("\n");

  return PARTICIPANT_REQUEST_PROMPT
    .replace("{{AGENT_NAME}}", agentName)
    .replace("{{HISTORY}}", history)
    .replace("{{TASK}}", task);
}

function buildSynthesisPrompt(state: GroupChatState): string {
  const participantList = state.agents
    .map((a) => `- @${a.name.replace(/\s+/g, "-")} (${a.type})`)
    .join("\n");

  const history = state.chatLog
    .slice(-30)
    .map((e) => `[${e.from}]: ${e.content.slice(0, 500)}`)
    .join("\n");

  return SYNTHESIS_PROMPT
    .replace("{{PARTICIPANT_LIST}}", participantList)
    .replace("{{HISTORY}}", history);
}
