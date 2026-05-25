import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { NormalizedEvent } from "@argo/shared";
import type { AdapterConfig, AdapterCallbacks, ManagedRuntime, TokenUsageSnapshot } from "../types.js";
import { parseStreamJsonLine, createUserTurnPayload, type ParsedUsage } from "./parser.js";
import { generateHookRelay, cleanupHookRelay, ALLOWED_TOOLS, type HookRelayPaths } from "./hook-relay.js";
import { platform } from "../../platform/index.js";
import { registerSession, unregisterSession } from "../../hook-server/index.js";

const CONTEXT_WINDOW_TOKENS = 200_000;

interface PendingTurn {
  resolve: () => void;
  reject: (error: Error) => void;
}

export async function launchClaude(
  config: AdapterConfig,
  callbacks: AdapterCallbacks,
  initialMessage?: string,
): Promise<ManagedRuntime> {
  const { sessionId, workspace, conversationId, systemPrompt, model, permissionMode } = config;

  const hookRelay = generateHookRelay(sessionId);
  const claudeSessionId = sessionId;

  const args = buildArgs(claudeSessionId, hookRelay.settingsPath, permissionMode, model, systemPrompt);

  let claudeBinary: string;
  try {
    claudeBinary = platform.resolveBinary("claude");
  } catch {
    callbacks.onEvent({
      type: "error",
      sessionId,
      message: "claude binary not found on PATH. Install Claude Code CLI or set ARGO_CLAUDE_PATH.",
      code: "MISSING_BINARY",
      recoverable: false,
    });
    cleanupHookRelay(hookRelay);
    throw new Error("claude binary not found on PATH");
  }

  const proc = spawn(claudeBinary, args, {
    cwd: workspace,
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env },
  });

  registerSession(claudeSessionId, conversationId, sessionId);

  callbacks.onEvent({
    type: "session_start",
    sessionId,
    provider: "claude_code",
    workspace,
    agentId: "",
    conversationId,
  });

  const runtime = createRuntime(proc, sessionId, callbacks, hookRelay, claudeSessionId);

  setupStdoutParser(proc, sessionId, callbacks, runtime);
  setupStderrHandler(proc, sessionId, callbacks);
  setupExitHandler(proc, sessionId, callbacks, hookRelay, claudeSessionId, runtime);

  // Send initial message if provided
  if (initialMessage) {
    const payload = createUserTurnPayload(initialMessage) + "\n";
    proc.stdin!.write(payload);
  }

  return runtime;
}

function buildArgs(
  sessionId: string,
  settingsPath: string,
  permissionMode?: "default" | "trust",
  model?: string,
  systemPrompt?: string,
): string[] {
  const args = [
    "-p",
    "--verbose",
    "--output-format=stream-json",
    "--input-format=stream-json",
    "--include-partial-messages",
    "--session-id", sessionId,
    "--settings", settingsPath,
  ];

  if (model) {
    args.push("--model", model);
  }

  if (permissionMode === "trust") {
    args.push("--dangerously-skip-permissions");
  } else {
    args.push("--permission-mode", "default");
    args.push("--allowedTools", [...ALLOWED_TOOLS].join(" "));
  }

  if (systemPrompt) {
    args.push("--system-prompt", systemPrompt);
  }

  return args;
}

interface RuntimeState {
  active: boolean;
  pendingTurns: PendingTurn[];
  cumulativeUsage: TokenUsageSnapshot;
  activeModel: string | null;
}

function createRuntime(
  proc: ChildProcess,
  sessionId: string,
  callbacks: AdapterCallbacks,
  hookRelay: HookRelayPaths,
  claudeSessionId: string,
): ManagedRuntime & { _state: RuntimeState } {
  const state: RuntimeState = {
    active: true,
    pendingTurns: [],
    cumulativeUsage: {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      cachedInputTokens: 0,
    },
    activeModel: null,
  };

  const runtime: ManagedRuntime & { _state: RuntimeState } = {
    _state: state,
    async sendMessage(content: string): Promise<void> {
      if (!state.active || proc.killed || !proc.stdin?.writable) {
        throw new Error("Claude runtime is not active");
      }
      const trimmed = content.trim();
      if (!trimmed) return;

      return new Promise<void>((resolve, reject) => {
        state.pendingTurns.push({ resolve, reject });
        try {
          proc.stdin!.write(createUserTurnPayload(trimmed) + "\n");
        } catch (err) {
          const pending = state.pendingTurns.pop();
          pending?.reject(err instanceof Error ? err : new Error(String(err)));
        }
      });
    },
    terminate(): void {
      if (!state.active) return;
      state.active = false;
      try { proc.kill(); } catch { /* already exited */ }
    },
    isActive(): boolean {
      return state.active;
    },
  };

  return runtime;
}

function setupStdoutParser(
  proc: ChildProcess,
  sessionId: string,
  callbacks: AdapterCallbacks,
  runtime: ManagedRuntime & { _state: RuntimeState },
): void {
  let buffer = "";
  const state = runtime._state;

  proc.stdout?.setEncoding("utf8");
  proc.stdout?.on("data", (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const result = parseStreamJsonLine(sessionId, line);

      if (result.model) {
        state.activeModel = result.model;
      }

      for (const event of result.events) {
        callbacks.onEvent(event);
      }

      if (result.isResult) {
        if (result.usage) {
          updateUsage(state, result.usage, callbacks, sessionId);
        }
        // Resolve pending turn
        const pending = state.pendingTurns.shift();
        pending?.resolve();
      }
    }
  });
}

function setupStderrHandler(proc: ChildProcess, sessionId: string, callbacks: AdapterCallbacks): void {
  let stderrBuf = "";
  proc.stderr?.setEncoding("utf8");
  proc.stderr?.on("data", (chunk: string) => {
    stderrBuf += chunk;
    const lines = stderrBuf.split("\n");
    stderrBuf = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        callbacks.onEvent({
          type: "error",
          sessionId,
          message: trimmed,
          code: "STDERR",
          recoverable: true,
        });
      }
    }
  });
}

function setupExitHandler(
  proc: ChildProcess,
  sessionId: string,
  callbacks: AdapterCallbacks,
  hookRelay: HookRelayPaths,
  claudeSessionId: string,
  runtime: ManagedRuntime & { _state: RuntimeState },
): void {
  proc.on("close", (code) => {
    const state = runtime._state;
    state.active = false;

    // Reject any pending turns
    while (state.pendingTurns.length > 0) {
      const pending = state.pendingTurns.shift();
      pending?.reject(new Error(`Claude process exited with code ${code}`));
    }

    callbacks.onEvent({
      type: "session_end",
      sessionId,
      exitCode: code ?? 1,
    });

    callbacks.onExit(code);
    unregisterSession(claudeSessionId);
    cleanupHookRelay(hookRelay);
  });

  proc.on("error", (err) => {
    callbacks.onEvent({
      type: "error",
      sessionId,
      message: err.message,
      code: "PROCESS_ERROR",
      recoverable: false,
    });
  });
}

function updateUsage(
  state: RuntimeState,
  usage: ParsedUsage,
  callbacks: AdapterCallbacks,
  sessionId: string,
): void {
  state.cumulativeUsage.inputTokens += usage.inputTokens;
  state.cumulativeUsage.outputTokens += usage.outputTokens;
  state.cumulativeUsage.cachedInputTokens += usage.cacheReadInputTokens + usage.cacheCreationInputTokens;
  state.cumulativeUsage.totalTokens = state.cumulativeUsage.inputTokens + state.cumulativeUsage.outputTokens;
  state.cumulativeUsage.model = state.activeModel ?? undefined;
  state.cumulativeUsage.contextUsedTokens = usage.inputTokens;
  state.cumulativeUsage.contextWindowTokens = CONTEXT_WINDOW_TOKENS;
  state.cumulativeUsage.contextPercent = (usage.inputTokens / CONTEXT_WINDOW_TOKENS) * 100;

  callbacks.onUsageUpdate?.(state.cumulativeUsage);

  callbacks.onEvent({
    type: "token_usage",
    sessionId,
    provider: "claude_code",
    model: state.activeModel ?? undefined,
    inputTokens: state.cumulativeUsage.inputTokens,
    outputTokens: state.cumulativeUsage.outputTokens,
    totalTokens: state.cumulativeUsage.totalTokens,
    cachedInputTokens: state.cumulativeUsage.cachedInputTokens,
    contextUsedTokens: usage.inputTokens,
    contextWindowTokens: CONTEXT_WINDOW_TOKENS,
    contextPercent: state.cumulativeUsage.contextPercent,
  });
}
