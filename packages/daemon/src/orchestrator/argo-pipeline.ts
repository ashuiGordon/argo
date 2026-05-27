import { randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import type { NormalizedEvent, ArgoPhase, ArgoState, SkillConfig } from "@argo/shared";
import type { AdapterConfig, AdapterCallbacks, ManagedRuntime } from "../adapters/types.js";
import { EventPersistence } from "../event-bus/persist.js";
import { getQueries } from "../db/init.js";

interface AgentWithConfig {
  id: string;
  name: string;
  type: string;
  system_prompt: string | null;
  config: string;
}

interface RoleAssignment {
  architect: AgentWithConfig;
  coder: AgentWithConfig;
  reviewer: AgentWithConfig;
  runner: AgentWithConfig | null;
  ops: AgentWithConfig;
}

const PHASE_ORDER: ArgoPhase[] = ["clarify", "specify", "plan", "tasks", "implement", "review", "commit", "done"];
const AGENT_TIMEOUT_MS = 300_000;

// Skill assignments per phase
const PHASE_SKILLS: Record<string, string[]> = {
  clarify: ["speckit-clarify"],
  specify: ["speckit-specify"],
  plan: ["speckit-plan"],
  tasks: ["speckit-tasks"],
  implement: ["speckit-implement"],
  review: ["speckit-analyze", "speckit-checklist"],
  commit: ["speckit-git-commit"],
};

// Locate the skills directory relative to the project
function findSkillsDir(workspace: string): string | null {
  const candidates = [
    join(workspace, ".claude", "skills"),
    resolve(workspace, "../../.claude/skills"),
    resolve(process.cwd(), ".claude/skills"),
  ];
  for (const dir of candidates) {
    if (existsSync(dir)) return dir;
  }
  return null;
}

function loadSkill(skillsDir: string, skillName: string): SkillConfig | null {
  const skillFile = join(skillsDir, skillName, "SKILL.md");
  if (!existsSync(skillFile)) return null;

  const content = readFileSync(skillFile, "utf-8");

  // Parse YAML frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) return null;

  const frontmatter = fmMatch[1];
  const body = fmMatch[2].trim();

  // Extract name and description from frontmatter
  const nameMatch = frontmatter.match(/^name:\s*"?([^"\n]+)"?/m);
  const descMatch = frontmatter.match(/^description:\s*"?([^"\n]+)"?/m);

  const name = nameMatch?.[1] || skillName;
  const description = descMatch?.[1] || `Skill: ${skillName}`;

  return { name, description, prompt: body };
}

function loadSkillsForPhase(workspace: string, phase: string): SkillConfig[] {
  const skillNames = PHASE_SKILLS[phase];
  if (!skillNames) return [];

  const skillsDir = findSkillsDir(workspace);
  if (!skillsDir) return [];

  const skills: SkillConfig[] = [];
  for (const name of skillNames) {
    const skill = loadSkill(skillsDir, name);
    if (skill) skills.push(skill);
  }
  return skills;
}

export async function runArgoPipeline(
  conversationId: string,
  sessionId: string,
  message: string,
  agents: AgentWithConfig[],
  workspace: string,
  existingState?: ArgoState | null,
): Promise<void> {
  const queries = getQueries();
  const persistence = new EventPersistence(queries);

  let state: ArgoState = existingState || {
    phase: "clarify",
    featureDir: "",
    clarifyDone: false,
    artifacts: {},
  };

  const roles = assignRoles(agents);
  const chatLog: Array<{ from: string; content: string }> = [];

  // Load recent chat history
  const existingEvents = queries.getEvents(conversationId, 0, 50);
  for (const evt of existingEvents) {
    try {
      const payload = JSON.parse(evt.payload);
      if (payload.type === "message") {
        chatLog.push({
          from: payload.role === "user" ? "user" : (payload.agentName || "assistant"),
          content: payload.content?.slice(0, 500) || "",
        });
      }
    } catch { /* skip */ }
  }

  chatLog.push({ from: "user", content: message });

  // Determine feature directory
  if (!state.featureDir) {
    const slug = generateFeatureSlug(message);
    state.featureDir = `specs/${slug}`;
  }

  // Emit current phase
  emitPhaseChange(persistence, conversationId, sessionId, state.phase, state.phase);
  persistState(queries, conversationId, state);

  // Phase execution
  switch (state.phase) {
    case "clarify": {
      const skills = loadSkillsForPhase(workspace, "clarify");
      const taskMsg = `/speckit-clarify ${message}`;
      const output = await runAgent(roles.architect, {
        workspace,
        conversationId,
        systemPrompt: roles.architect.system_prompt || undefined,
        skills,
      }, taskMsg, persistence, "Architect");

      if (output.toLowerCase().includes("requirements are clear") || state.clarifyDone) {
        state.clarifyDone = true;
        state = advancePhase(state);
        emitPhaseChange(persistence, conversationId, sessionId, "clarify", state.phase);
        persistState(queries, conversationId, state);

        chatLog.push({ from: "Architect", content: output });
        await executePhaseChain(state, roles, chatLog, workspace, persistence, conversationId, sessionId, queries, message);
      } else {
        persistState(queries, conversationId, state);
      }
      break;
    }

    case "specify":
    case "plan":
    case "tasks":
    case "implement":
    case "review":
    case "commit": {
      await executePhaseChain(state, roles, chatLog, workspace, persistence, conversationId, sessionId, queries, message);
      break;
    }

    case "done": {
      const doneEvent: NormalizedEvent = {
        type: "message",
        sessionId,
        role: "assistant",
        content: "[Argo] Pipeline complete. All phases finished successfully.",
        streaming: false,
        final: true,
      };
      persistence.persist(doneEvent, conversationId);
      break;
    }
  }
}

async function executePhaseChain(
  state: ArgoState,
  roles: RoleAssignment,
  chatLog: Array<{ from: string; content: string }>,
  workspace: string,
  persistence: EventPersistence,
  conversationId: string,
  sessionId: string,
  queries: ReturnType<typeof getQueries>,
  userMessage: string,
): Promise<void> {
  while (state.phase !== "done") {
    const result = await executeSinglePhase(state, roles, chatLog, workspace, persistence, conversationId, sessionId, queries, userMessage);

    if (!result.advance) break;

    state = advancePhase(state);
    emitPhaseChange(persistence, conversationId, sessionId, result.completedPhase, state.phase);
    persistState(queries, conversationId, state);

    if (state.phase === "done") {
      const doneEvent: NormalizedEvent = {
        type: "message",
        sessionId,
        role: "assistant",
        content: "[Argo] Pipeline complete! Feature has been specified, planned, implemented, reviewed, and committed.",
        streaming: false,
        final: true,
      };
      persistence.persist(doneEvent, conversationId);
      break;
    }
  }
}

async function executeSinglePhase(
  state: ArgoState,
  roles: RoleAssignment,
  _chatLog: Array<{ from: string; content: string }>,
  workspace: string,
  persistence: EventPersistence,
  conversationId: string,
  _sessionId: string,
  queries: ReturnType<typeof getQueries>,
  userMessage: string,
): Promise<{ advance: boolean; completedPhase: ArgoPhase }> {
  const phase = state.phase;
  const skills = loadSkillsForPhase(workspace, phase);

  switch (phase) {
    case "specify": {
      const taskMsg = `/speckit-specify ${userMessage}`;
      await runAgent(roles.architect, {
        workspace,
        conversationId,
        systemPrompt: roles.architect.system_prompt || undefined,
        skills,
      }, taskMsg, persistence, "Architect");

      state.artifacts.spec = true;
      persistState(queries, conversationId, state);
      return { advance: true, completedPhase: "specify" };
    }

    case "plan": {
      const taskMsg = `/speckit-plan`;
      await runAgent(roles.architect, {
        workspace,
        conversationId,
        systemPrompt: roles.architect.system_prompt || undefined,
        skills,
      }, taskMsg, persistence, "Architect");

      state.artifacts.plan = true;
      persistState(queries, conversationId, state);
      return { advance: true, completedPhase: "plan" };
    }

    case "tasks": {
      const taskMsg = `/speckit-tasks`;
      await runAgent(roles.architect, {
        workspace,
        conversationId,
        systemPrompt: roles.architect.system_prompt || undefined,
        skills,
      }, taskMsg, persistence, "Architect");

      state.artifacts.tasks = true;
      persistState(queries, conversationId, state);
      return { advance: true, completedPhase: "tasks" };
    }

    case "implement": {
      const taskMsg = `/speckit-implement`;
      await runAgent(roles.coder, {
        workspace,
        conversationId,
        systemPrompt: roles.coder.system_prompt || undefined,
        skills,
      }, taskMsg, persistence, "Coder");

      state.implementProgress = { total: 1, completed: 1 };
      persistState(queries, conversationId, state);
      return { advance: true, completedPhase: "implement" };
    }

    case "review": {
      const taskMsg = `/speckit-analyze`;
      const output = await runAgent(roles.reviewer, {
        workspace,
        conversationId,
        systemPrompt: roles.reviewer.system_prompt || undefined,
        skills,
      }, taskMsg, persistence, "Reviewer");

      const passed = output.toLowerCase().includes("**result**: pass") || output.toLowerCase().includes("result: pass") || !output.toLowerCase().includes("fail");
      state.reviewResult = passed ? "pass" : "fail";
      persistState(queries, conversationId, state);

      if (!passed) {
        return { advance: false, completedPhase: "review" };
      }
      return { advance: true, completedPhase: "review" };
    }

    case "commit": {
      const taskMsg = `/speckit-git-commit`;
      await runAgent(roles.ops, {
        workspace,
        conversationId,
        systemPrompt: roles.ops.system_prompt || undefined,
        skills,
      }, taskMsg, persistence, "Ops");

      return { advance: true, completedPhase: "commit" };
    }

    default:
      return { advance: false, completedPhase: phase };
  }
}

interface RunAgentOpts {
  workspace: string;
  conversationId: string;
  systemPrompt?: string;
  skills: SkillConfig[];
}

async function runAgent(
  agent: AgentWithConfig,
  opts: RunAgentOpts,
  message: string,
  persistence: EventPersistence,
  agentLabel: string,
): Promise<string> {
  return new Promise(async (resolve) => {
    let output = "";
    let runtime: ManagedRuntime | undefined;

    const timeout = setTimeout(() => {
      runtime?.terminate();
      resolve(output || `[${agentLabel} timed out after ${AGENT_TIMEOUT_MS / 1000}s]`);
    }, AGENT_TIMEOUT_MS);

    const config: AdapterConfig = {
      workspace: opts.workspace,
      sessionId: randomUUID(),
      conversationId: opts.conversationId,
      systemPrompt: opts.systemPrompt,
      skills: opts.skills.length > 0 ? opts.skills : undefined,
      permissionMode: "trust",
    };

    const callbacks: AdapterCallbacks = {
      onEvent(event) {
        persistence.persist(event, opts.conversationId);
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
      const provider = agent.type === "codex" ? "codex" : "claude_code";
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

function assignRoles(agents: AgentWithConfig[]): RoleAssignment {
  const roleKeywords: Record<string, string[]> = {
    architect: ["architect", "规划", "planner", "designer"],
    coder: ["coder", "developer", "开发", "programmer"],
    reviewer: ["reviewer", "审查", "auditor", "checker"],
    runner: ["runner", "执行", "executor"],
    ops: ["ops", "devops", "管理", "git"],
  };

  function findByRole(role: string): AgentWithConfig | null {
    const keywords = roleKeywords[role];
    for (const agent of agents) {
      const searchText = `${agent.name} ${agent.system_prompt || ""}`.toLowerCase();
      if (keywords.some((k) => searchText.includes(k))) {
        return agent;
      }
    }
    return null;
  }

  const claudeAgents = agents.filter((a) => a.type === "claude_code");
  const codexAgents = agents.filter((a) => a.type === "codex");
  const defaultAgent = claudeAgents[0] || agents[0];

  return {
    architect: findByRole("architect") || defaultAgent,
    coder: findByRole("coder") || defaultAgent,
    reviewer: findByRole("reviewer") || defaultAgent,
    runner: findByRole("runner") || codexAgents[0] || null,
    ops: findByRole("ops") || defaultAgent,
  };
}

function advancePhase(state: ArgoState): ArgoState {
  const currentIdx = PHASE_ORDER.indexOf(state.phase);
  if (currentIdx < PHASE_ORDER.length - 1) {
    return { ...state, phase: PHASE_ORDER[currentIdx + 1] };
  }
  return state;
}

function emitPhaseChange(
  persistence: EventPersistence,
  conversationId: string,
  sessionId: string,
  previousPhase: ArgoPhase,
  newPhase: ArgoPhase,
): void {
  const event: NormalizedEvent = {
    type: "argo_phase_change",
    sessionId,
    phase: newPhase,
    previousPhase,
  };
  persistence.persist(event, conversationId);
}

function persistState(
  queries: ReturnType<typeof getQueries>,
  conversationId: string,
  state: ArgoState,
): void {
  queries.updateArgoState(conversationId, JSON.stringify(state));
}

function generateFeatureSlug(message: string): string {
  const words = message
    .toLowerCase()
    .replace(/[^a-z0-9\s一-鿿]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 4);

  if (words.length === 0) {
    return `feature-${Date.now().toString(36)}`;
  }
  return words.join("-") || `feature-${Date.now().toString(36)}`;
}
