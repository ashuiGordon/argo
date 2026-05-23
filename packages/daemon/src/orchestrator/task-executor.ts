import type { OrchestratorTask } from "./task-queue.js";
import type { TaskExecutor } from "./scheduler.js";
import { spawnClaudeCode } from "../providers/claude/adapter.js";
import { spawnCodex } from "../providers/codex/adapter.js";
import { eventBus } from "../event-bus/index.js";

interface AgentInfo {
  id: string;
  name: string;
  type: string;
  system_prompt: string | null;
}

export function createTaskExecutor(
  conversationId: string,
  agents: AgentInfo[],
  workspace: string,
): TaskExecutor {
  const agentByName = new Map(agents.map((a) => [a.name, a]));

  return async (task: OrchestratorTask) => {
    const agent = agentByName.get(task.assignee) || agents[0];
    const prompt = task.description;

    if (agent.type === "codex") {
      return executeAgent(() => spawnCodex(conversationId, prompt, workspace));
    }
    return executeAgent(() => spawnClaudeCode(conversationId, prompt, workspace, agent.system_prompt || undefined));
  };
}

function executeAgent(spawn: () => { sessionId: string }): Promise<{ output?: string; tokensUsed?: number }> {
  return new Promise((resolve) => {
    const { sessionId } = spawn();
    let lastContent = "";

    const onEvent = (event: { type: string; sessionId: string; role?: string; content?: string }) => {
      if (event.sessionId !== sessionId) return;
      if (event.type === "message" && event.role === "assistant") {
        lastContent = event.content || "";
      }
      if (event.type === "session_end") {
        eventBus.off("event", onEvent as never);
        resolve({ output: lastContent || "Task completed." });
      }
    };

    eventBus.on("event", onEvent as never);

    setTimeout(() => {
      eventBus.off("event", onEvent as never);
      resolve({ output: lastContent || "Task timed out." });
    }, 120_000);
  });
}
