import type { OrchestratorTask } from "./task-queue.js";
import type { TaskExecutor } from "./scheduler.js";
import type { AdapterConfig, AdapterCallbacks, ManagedRuntime } from "../adapters/types.js";
import { eventBus } from "../event-bus/index.js";
import { randomUUID } from "node:crypto";
import { getWorktreeManager, type WorktreeInfo } from "../worktree/manager.js";
import { isGitRepo } from "../worktree/utils.js";

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
  const useWorktrees = isGitRepo(workspace);
  const worktreeManager = useWorktrees ? getWorktreeManager() : null;

  return async (task: OrchestratorTask) => {
    const agent = agentByName.get(task.assignee) || agents[0];
    const provider = agent.type === "codex" ? "codex" as const : "claude_code" as const;
    const sessionId = randomUUID();

    let agentWorkspace = workspace;
    let worktree: WorktreeInfo | null = null;

    if (worktreeManager) {
      try {
        worktree = worktreeManager.create({
          workspace,
          sessionId,
          agentName: agent.name,
          conversationId,
        });
        agentWorkspace = worktree.path;
      } catch {
        // Fall back to shared workspace if worktree creation fails
      }
    }

    const config: AdapterConfig = {
      workspace: agentWorkspace,
      sessionId,
      conversationId,
      systemPrompt: agent.system_prompt || undefined,
    };

    const result = await executeWithAdapter(provider, config, task.description);

    if (worktree && worktreeManager) {
      const mergeResult = worktreeManager.merge(worktree.path);
      worktreeManager.remove(worktree.path);
      if (!mergeResult.success) {
        result.output = `${result.output || ""}\n[Merge conflicts: ${mergeResult.conflicts?.join(", ")}]`;
      }
    }

    return result;
  };
}

async function executeWithAdapter(
  provider: "claude_code" | "codex",
  config: AdapterConfig,
  prompt: string,
): Promise<{ output?: string; tokensUsed?: number }> {
  return new Promise(async (resolve) => {
    let lastContent = "";
    let totalTokens = 0;

    const callbacks: AdapterCallbacks = {
      onEvent: (event) => {
        eventBus.emit("event", event, 0, config.conversationId);
        if (event.type === "message" && "role" in event && event.role === "assistant" && "content" in event) {
          lastContent = event.content as string;
        }
        if (event.type === "token_usage" && "totalTokens" in event) {
          totalTokens = event.totalTokens as number;
        }
      },
      onExit: () => {
        resolve({ output: lastContent || "Task completed.", tokensUsed: totalTokens || undefined });
      },
    };

    const timeout = setTimeout(() => {
      runtime?.terminate();
      resolve({ output: lastContent || "Task timed out.", tokensUsed: totalTokens || undefined });
    }, 120_000);

    let runtime: ManagedRuntime | undefined;

    try {
      if (provider === "claude_code") {
        const { launchClaudeSdk } = await import("../adapters/claude/sdk-launcher.js");
        runtime = await launchClaudeSdk(config, callbacks, prompt);
      } else {
        const { launchCodexSdk } = await import("../adapters/codex/sdk-launcher.js");
        runtime = await launchCodexSdk(config, callbacks, prompt);
      }
    } catch (err) {
      clearTimeout(timeout);
      resolve({ output: `Failed to launch ${provider}: ${err}` });
    }

    callbacks.onExit = (code) => {
      clearTimeout(timeout);
      resolve({ output: lastContent || "Task completed.", tokensUsed: totalTokens || undefined });
    };
  });
}
