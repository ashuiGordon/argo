import { Codex } from "@openai/codex-sdk";
import { execSync } from "node:child_process";
import type { NormalizedEvent } from "@argo/shared";
import type { AdapterConfig, AdapterCallbacks, ManagedRuntime, TokenUsageSnapshot } from "../types.js";

const CONTEXT_WINDOW_TOKENS = 128_000;

let resolvedCodexPath: string | undefined;
function getCodexPath(): string | undefined {
  if (resolvedCodexPath !== undefined) return resolvedCodexPath || undefined;
  const envPath = process.env.ARGO_CODEX_PATH;
  if (envPath) {
    resolvedCodexPath = envPath;
    return envPath;
  }
  try {
    resolvedCodexPath = execSync("which codex", { encoding: "utf8" }).trim();
  } catch {
    resolvedCodexPath = "";
  }
  return resolvedCodexPath || undefined;
}

interface CodexSessionState {
  active: boolean;
  threadId: string | null;
  thread: ReturnType<InstanceType<typeof Codex>["startThread"]> | null;
  codex: Codex | null;
  abortController: AbortController;
  cumulativeUsage: TokenUsageSnapshot;
}

export async function launchCodexSdk(
  config: AdapterConfig,
  callbacks: AdapterCallbacks,
  initialMessage: string,
): Promise<ManagedRuntime> {
  const { sessionId, workspace, conversationId, systemPrompt, skills, contextPreamble } = config;

  const state: CodexSessionState = {
    active: true,
    threadId: null,
    thread: null,
    codex: null,
    abortController: new AbortController(),
    cumulativeUsage: {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      cachedInputTokens: 0,
    },
  };

  const codexPath = getCodexPath();
  const codex = new Codex({
    ...(codexPath ? { codexPathOverride: codexPath } : {}),
    env: { ...process.env } as Record<string, string>,
  });
  state.codex = codex;

  const thread = codex.startThread({
    workingDirectory: workspace,
    sandboxMode: config.permissionMode === "trust" ? "danger-full-access" : "workspace-write",
    approvalPolicy: "never",
    skipGitRepoCheck: true,
  });
  state.thread = thread;

  callbacks.onEvent({
    type: "session_start",
    sessionId,
    provider: "codex",
    workspace,
    agentId: "",
    conversationId,
  });

  runTurn(initialMessage, config, state, callbacks);

  const runtime: ManagedRuntime = {
    async sendMessage(content: string): Promise<void> {
      if (!state.active || !state.thread) {
        throw new Error("Codex runtime is not active");
      }
      const trimmed = content.trim();
      if (!trimmed) return;
      runTurn(trimmed, config, state, callbacks);
    },
    terminate(): void {
      if (!state.active) return;
      state.active = false;
      state.abortController.abort();
    },
    isActive(): boolean {
      return state.active;
    },
  };

  return runtime;
}

async function runTurn(
  message: string,
  config: AdapterConfig,
  state: CodexSessionState,
  callbacks: AdapterCallbacks,
): Promise<void> {
  const { sessionId } = config;

  if (!state.thread) return;

  try {
    const { events } = await state.thread.runStreamed(message, {
      signal: state.abortController.signal,
    });

    for await (const event of events) {
      if (!state.active) break;

      switch (event.type) {
        case "thread.started":
          state.threadId = event.thread_id;
          break;

        case "item.completed": {
          const item = event.item;
          switch (item.type) {
            case "agent_message":
              callbacks.onEvent({
                type: "message",
                sessionId,
                role: "assistant",
                content: item.text,
                streaming: false,
                final: true,
              });
              break;

            case "command_execution":
              callbacks.onEvent({
                type: "tool_use",
                sessionId,
                tool: "CommandExecution",
                input: { command: item.command },
              });
              callbacks.onEvent({
                type: "tool_result",
                sessionId,
                tool: "CommandExecution",
                output: item.aggregated_output.slice(0, 10000),
                success: item.status === "completed" && (item.exit_code === 0 || item.exit_code === undefined),
              });
              break;

            case "file_change":
              callbacks.onEvent({
                type: "tool_use",
                sessionId,
                tool: "FileChange",
                input: { changes: item.changes },
              });
              callbacks.onEvent({
                type: "tool_result",
                sessionId,
                tool: "FileChange",
                output: item.changes.map((c) => `${c.kind}: ${c.path}`).join("\n"),
                success: item.status === "completed",
              });
              break;

            case "mcp_tool_call":
              callbacks.onEvent({
                type: "tool_use",
                sessionId,
                tool: `${item.server}/${item.tool}`,
                input: (item.arguments ?? {}) as Record<string, unknown>,
              });
              callbacks.onEvent({
                type: "tool_result",
                sessionId,
                tool: `${item.server}/${item.tool}`,
                output: item.error?.message || JSON.stringify(item.result?.content ?? "").slice(0, 10000),
                success: item.status === "completed" && !item.error,
              });
              break;

            case "reasoning":
              // Optionally emit reasoning as a message
              break;

            case "error":
              callbacks.onEvent({
                type: "error",
                sessionId,
                message: item.message,
                code: "CODEX_ITEM_ERROR",
                recoverable: true,
              });
              break;
          }
          break;
        }

        case "turn.completed": {
          const usage = event.usage;
          state.cumulativeUsage.inputTokens += usage.input_tokens;
          state.cumulativeUsage.outputTokens += usage.output_tokens;
          state.cumulativeUsage.cachedInputTokens += usage.cached_input_tokens;
          state.cumulativeUsage.totalTokens = state.cumulativeUsage.inputTokens + state.cumulativeUsage.outputTokens;
          state.cumulativeUsage.contextUsedTokens = usage.input_tokens;
          state.cumulativeUsage.contextWindowTokens = CONTEXT_WINDOW_TOKENS;
          state.cumulativeUsage.contextPercent = (usage.input_tokens / CONTEXT_WINDOW_TOKENS) * 100;

          callbacks.onUsageUpdate?.(state.cumulativeUsage);

          callbacks.onEvent({
            type: "token_usage",
            sessionId,
            provider: "codex",
            model: undefined,
            inputTokens: state.cumulativeUsage.inputTokens,
            outputTokens: state.cumulativeUsage.outputTokens,
            totalTokens: state.cumulativeUsage.totalTokens,
            cachedInputTokens: state.cumulativeUsage.cachedInputTokens,
            contextUsedTokens: usage.input_tokens,
            contextWindowTokens: CONTEXT_WINDOW_TOKENS,
            contextPercent: state.cumulativeUsage.contextPercent,
          });
          break;
        }

        case "turn.failed":
          callbacks.onEvent({
            type: "error",
            sessionId,
            message: event.error.message,
            code: "CODEX_TURN_FAILED",
            recoverable: false,
          });
          break;

        case "error":
          callbacks.onEvent({
            type: "error",
            sessionId,
            message: event.message,
            code: "CODEX_STREAM_ERROR",
            recoverable: false,
          });
          break;
      }
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    if (error.name === "AbortError") {
      // Expected — user terminated
    } else {
      callbacks.onEvent({
        type: "error",
        sessionId,
        message: error.message,
        code: "CODEX_SDK_ERROR",
        recoverable: false,
      });
    }
  } finally {
    state.active = false;
    callbacks.onEvent({
      type: "session_end",
      sessionId,
      exitCode: 0,
    });
    callbacks.onExit(0);
  }
}
