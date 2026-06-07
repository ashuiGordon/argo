import { query } from "@anthropic-ai/claude-code";
import { execSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { resolve, extname, basename } from "node:path";
import type { NormalizedEvent } from "@argo/shared";
import type { AdapterConfig, AdapterCallbacks, ManagedRuntime, TokenUsageSnapshot } from "../types.js";
import { classifyRisk } from "../../approval/risk-classifier.js";
import { createApprovalRequest } from "../../approval/dual-channel.js";

let resolvedClaudePath: string | undefined;
function getClaudePath(): string | undefined {
  if (resolvedClaudePath !== undefined) return resolvedClaudePath || undefined;
  // Prefer the globally installed claude over any local node_modules/.bin/claude
  const fallbacks = [
    `${process.env.HOME}/.local/bin/claude`,
    "/usr/local/bin/claude",
  ];
  for (const p of fallbacks) {
    try {
      execSync(`test -x "${p}"`);
      resolvedClaudePath = p;
      console.log(`[claude-sdk] Using claude at: ${p}`);
      return p;
    } catch { /* skip */ }
  }
  try {
    resolvedClaudePath = execSync("which claude", { encoding: "utf8" }).trim();
  } catch {
    resolvedClaudePath = "";
  }
  console.log(`[claude-sdk] Resolved claude path: ${resolvedClaudePath || "(not found)"}`);
  return resolvedClaudePath || undefined;
}

const CONTEXT_WINDOW_TOKENS = 200_000;

const READ_ONLY_TOOLS = new Set([
  "Read", "Glob", "Grep", "WebSearch", "WebFetch", "Agent",
  "TodoRead", "TodoWrite", "AskUserQuestion", "LS", "View", "ListFiles",
]);

interface SdkSessionState {
  active: boolean;
  claudeSessionId: string | null;
  abortController: AbortController;
  model: string | null;
  cumulativeUsage: TokenUsageSnapshot;
  pendingMessage: { content: string; resolve: () => void; reject: (err: Error) => void } | null;
  knownFiles: Set<string>;
  lastScanTime: number;
}

const PREVIEWABLE_EXTS = new Set(["html", "htm", "pdf", "png", "jpg", "jpeg", "gif", "webp", "svg", "docx", "doc", "pptx", "ppt", "xlsx", "xls"]);

function scanWorkspaceFiles(workspace: string): Map<string, number> {
  const files = new Map<string, number>();
  try {
    const entries = readdirSync(workspace, { recursive: true, withFileTypes: false }) as string[];
    for (const entry of entries) {
      const fullPath = resolve(workspace, entry);
      try {
        const ext = extname(entry).slice(1).toLowerCase();
        if (PREVIEWABLE_EXTS.has(ext)) {
          const stat = statSync(fullPath);
          if (stat.isFile()) {
            files.set(fullPath, stat.mtimeMs);
          }
        }
      } catch { /* skip */ }
    }
  } catch { /* workspace may not exist */ }
  return files;
}

function scanForNewArtifacts(workspace: string, knownFiles: Set<string>, lastScanTime: number): { files: Array<{ filePath: string; fileName: string; ext: string }>; scanTime: number } {
  const currentFiles = scanWorkspaceFiles(workspace);
  const newFiles: Array<{ filePath: string; fileName: string; ext: string }> = [];
  const now = Date.now();

  for (const [filePath, mtime] of currentFiles) {
    if (!knownFiles.has(filePath) || mtime > lastScanTime) {
      knownFiles.add(filePath);
      const fileName = basename(filePath);
      const ext = extname(filePath).slice(1).toLowerCase();
      newFiles.push({ filePath, fileName, ext });
    }
  }

  return { files: newFiles, scanTime: now };
}

export async function launchClaudeSdk(
  config: AdapterConfig,
  callbacks: AdapterCallbacks,
  initialMessage: string,
): Promise<ManagedRuntime> {
  const { sessionId, workspace, conversationId, systemPrompt, model, permissionMode, mcpServers, skills, contextPreamble, maxTurns } = config;

  const state: SdkSessionState = {
    active: true,
    claudeSessionId: config.resumeSessionId || null,
    abortController: new AbortController(),
    model: null,
    cumulativeUsage: {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      cachedInputTokens: 0,
    },
    pendingMessage: null,
    knownFiles: new Set(scanWorkspaceFiles(workspace).keys()),
    lastScanTime: Date.now(),
  };

  callbacks.onEvent({
    type: "session_start",
    sessionId,
    provider: "claude_code",
    workspace,
    agentId: "",
    conversationId,
  });

  // Start processing the initial message
  runQuery(initialMessage, config, state, callbacks);

  const runtime: ManagedRuntime = {
    async sendMessage(content: string): Promise<void> {
      if (!state.active) {
        throw new Error("Claude runtime is not active");
      }
      const trimmed = content.trim();
      if (!trimmed) return;

      return new Promise<void>((resolve, reject) => {
        state.pendingMessage = { content: trimmed, resolve, reject };
        // If no query is currently running, start a new one with resume
        if (state.claudeSessionId) {
          runQuery(trimmed, config, state, callbacks);
        }
      });
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

function buildAppendSystemPrompt(config: AdapterConfig): string | undefined {
  const parts: string[] = [];

  if (config.skills && config.skills.length > 0) {
    const skillBlock = config.skills.map((s) =>
      `## Skill: /${s.name}\nDescription: ${s.description}\n\n${s.prompt}`
    ).join("\n\n---\n\n");
    parts.push(`# Custom Skills\n\n${skillBlock}`);
  }

  if (config.contextPreamble) {
    parts.push(config.contextPreamble);
  }

  return parts.length > 0 ? parts.join("\n\n") : undefined;
}

async function runQuery(
  message: string,
  config: AdapterConfig,
  state: SdkSessionState,
  callbacks: AdapterCallbacks,
): Promise<void> {
  const { sessionId, workspace, conversationId, systemPrompt, model, permissionMode } = config;

  const opts: Record<string, unknown> = {
    cwd: workspace,
    abortController: state.abortController,
    maxTurns: config.maxTurns || 100,
    pathToClaudeCodeExecutable: config.claudeCodePath || getClaudePath(),
  };

  if (permissionMode === "trust") {
    opts.permissionMode = "bypassPermissions";
  } else {
    opts.permissionMode = "default";
    opts.canUseTool = makeCanUseTool(sessionId, conversationId);
  }

  if (model) opts.model = model;

  const appendPrompt = buildAppendSystemPrompt(config);
  if (systemPrompt && appendPrompt) {
    opts.appendSystemPrompt = systemPrompt + "\n\n" + appendPrompt;
  } else if (systemPrompt) {
    opts.appendSystemPrompt = systemPrompt;
  } else if (appendPrompt) {
    opts.appendSystemPrompt = appendPrompt;
  }

  if (state.claudeSessionId) {
    opts.resume = state.claudeSessionId;
  }

  // Pass MCP servers directly via SDK option
  if (config.mcpServers && config.mcpServers.length > 0) {
    const mcpObj: Record<string, { command: string; args?: string[]; env?: Record<string, string> }> = {};
    for (const server of config.mcpServers) {
      mcpObj[server.name] = {
        command: server.command,
        ...(server.args && server.args.length > 0 ? { args: server.args } : {}),
        ...(server.env && Object.keys(server.env).length > 0 ? { env: server.env } : {}),
      };
    }
    opts.mcpServers = mcpObj;
  }

  console.log(`[claude-sdk] Starting query with path: ${opts.pathToClaudeCodeExecutable}, cwd: ${opts.cwd}, permMode: ${opts.permissionMode}`);

  try {
    const q = query({ prompt: message, options: opts });

    for await (const sdkMsg of q) {
      if (!state.active) break;

      const sdkType = (sdkMsg as Record<string, unknown>).type as string;
      const sdkSubtype = (sdkMsg as Record<string, unknown>).subtype as string | undefined;

      // System init — capture session ID
      if (sdkType === "system" && sdkSubtype === "init") {
        const initMsg = sdkMsg as { session_id?: string; model?: string };
        if (initMsg.session_id) {
          state.claudeSessionId = initMsg.session_id;
          callbacks.onProviderSessionId?.(initMsg.session_id);
        }
        if (initMsg.model) {
          state.model = initMsg.model;
        }
        continue;
      }

      // Content block streaming — emit partial text as it arrives
      if (sdkType === "content_block_start") {
        const block = sdkMsg as { index?: number; content_block?: { type: string; text?: string } };
        if (block.content_block?.type === "text") {
          const event: NormalizedEvent = {
            type: "message",
            sessionId,
            role: "assistant",
            content: "",
            streaming: true,
            final: false,
          };
          callbacks.onEvent(event);
        }
        continue;
      }

      if (sdkType === "content_block_delta") {
        const delta = sdkMsg as { delta?: { type: string; text?: string } };
        if (delta.delta?.type === "text_delta" && delta.delta.text) {
          const event: NormalizedEvent = {
            type: "message",
            sessionId,
            role: "assistant",
            content: delta.delta.text,
            streaming: true,
            final: false,
          };
          callbacks.onEvent(event);
        }
        continue;
      }

      if (sdkType === "content_block_stop") {
        continue;
      }

      // Assistant message — text and tool_use blocks
      if (sdkType === "assistant") {
        const msg = sdkMsg as { message?: { content?: Array<{ type: string; text?: string; thinking?: string; id?: string; name?: string; input?: Record<string, unknown> }> } };
        if (msg.message?.content) {
          for (const block of msg.message.content) {
            if (block.type === "thinking" && block.thinking) {
              const event: NormalizedEvent = {
                type: "thinking",
                sessionId,
                content: block.thinking,
              };
              callbacks.onEvent(event);
            } else if (block.type === "text" && block.text) {
              const event: NormalizedEvent = {
                type: "message",
                sessionId,
                role: "assistant",
                content: block.text,
                streaming: false,
                final: true,
              };
              callbacks.onEvent(event);
            } else if (block.type === "tool_use" && block.name) {
              const event: NormalizedEvent = {
                type: "tool_use",
                sessionId,
                tool: block.name,
                input: (block.input || {}) as Record<string, unknown>,
              };
              callbacks.onEvent(event);
            }
          }
        }
        continue;
      }

      // User message (tool results)
      if (sdkType === "user") {
        const msg = sdkMsg as { message?: { content?: Array<{ type: string; tool_use_id?: string; content?: unknown; is_error?: boolean }> } };
        if (msg.message?.content) {
          const blocks = Array.isArray(msg.message.content) ? msg.message.content : [];
          for (const block of blocks) {
            if (block.type === "tool_result") {
              const text = extractToolResultText(block.content);
              const event: NormalizedEvent = {
                type: "tool_result",
                sessionId,
                tool: block.tool_use_id || "unknown",
                output: text.slice(0, 10000),
                success: !block.is_error,
              };
              callbacks.onEvent(event);
            }
          }
        }
        continue;
      }

      // Result — completion or error
      if (sdkType === "result") {
        const result = sdkMsg as {
          subtype?: string;
          total_cost_usd?: number;
          duration_ms?: number;
          num_turns?: number;
          usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
          errors?: string[];
          modelUsage?: Record<string, unknown>;
        };

        const inputTokens = result.usage?.input_tokens || 0;
        const outputTokens = result.usage?.output_tokens || 0;
        const cacheRead = result.usage?.cache_read_input_tokens || 0;
        const cacheCreation = result.usage?.cache_creation_input_tokens || 0;
        const resultModel = Object.keys(result.modelUsage || {})[0] || state.model || undefined;

        state.cumulativeUsage.inputTokens += inputTokens;
        state.cumulativeUsage.outputTokens += outputTokens;
        state.cumulativeUsage.cachedInputTokens += cacheRead + cacheCreation;
        state.cumulativeUsage.totalTokens = state.cumulativeUsage.inputTokens + state.cumulativeUsage.outputTokens;
        state.cumulativeUsage.model = resultModel;
        state.cumulativeUsage.contextUsedTokens = inputTokens;
        state.cumulativeUsage.contextWindowTokens = CONTEXT_WINDOW_TOKENS;
        state.cumulativeUsage.contextPercent = (inputTokens / CONTEXT_WINDOW_TOKENS) * 100;

        callbacks.onUsageUpdate?.(state.cumulativeUsage);

        const usageEvent: NormalizedEvent = {
          type: "token_usage",
          sessionId,
          provider: "claude_code",
          model: resultModel,
          inputTokens: state.cumulativeUsage.inputTokens,
          outputTokens: state.cumulativeUsage.outputTokens,
          totalTokens: state.cumulativeUsage.totalTokens,
          cachedInputTokens: state.cumulativeUsage.cachedInputTokens,
          contextUsedTokens: inputTokens,
          contextWindowTokens: CONTEXT_WINDOW_TOKENS,
          contextPercent: state.cumulativeUsage.contextPercent,
        };
        callbacks.onEvent(usageEvent);

        if (sdkSubtype?.startsWith("error")) {
          const errMsg = result.errors?.join(", ") || "Unknown error";
          const errorEvent: NormalizedEvent = {
            type: "error",
            sessionId,
            message: errMsg,
            code: sdkSubtype || "SDK_ERROR",
            recoverable: false,
          };
          callbacks.onEvent(errorEvent);
        }

        // Resolve pending message promise
        if (state.pendingMessage) {
          state.pendingMessage.resolve();
          state.pendingMessage = null;
        }

        // Scan workspace for new previewable artifacts
        const scanResult = scanForNewArtifacts(workspace, state.knownFiles, state.lastScanTime);
        state.lastScanTime = scanResult.scanTime;
        if (scanResult.files.length > 0) {
          callbacks.onEvent({
            type: "artifacts_detected",
            sessionId,
            files: scanResult.files,
          });
        }

        continue;
      }
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));

    if (error.name === "AbortError") {
      // Abort is expected — user requested termination
    } else {
      const errorEvent: NormalizedEvent = {
        type: "error",
        sessionId,
        message: error.message,
        code: "SDK_ERROR",
        recoverable: false,
      };
      callbacks.onEvent(errorEvent);
    }

    if (state.pendingMessage) {
      state.pendingMessage.reject(error);
      state.pendingMessage = null;
    }

    // Only mark session as dead on errors or aborts
    state.active = false;
    callbacks.onEvent({
      type: "session_end",
      sessionId,
      exitCode: error.name === "AbortError" ? 0 : 1,
    });
    callbacks.onExit(error.name === "AbortError" ? 0 : 1);
  }
}

function makeCanUseTool(sessionId: string, conversationId: string) {
  return async (toolName: string, toolInput: Record<string, unknown>, _options: { signal: AbortSignal; suggestions?: unknown[] }) => {
    // Auto-approve read-only tools
    if (READ_ONLY_TOOLS.has(toolName)) {
      return { behavior: "allow" as const, updatedInput: toolInput };
    }

    // Classify risk
    const riskLevel = classifyRisk(toolName, toolInput);
    if (riskLevel === "low") {
      return { behavior: "allow" as const, updatedInput: toolInput };
    }

    // High/critical risk — request approval via dual-channel system
    const affectedPaths = extractPaths(toolInput);
    const { promise } = createApprovalRequest(
      sessionId,
      conversationId,
      toolName,
      toolInput,
      riskLevel,
      affectedPaths,
      `Tool '${toolName}' classified as ${riskLevel} risk`,
    );

    const decision = await promise;

    if (decision === "approve" || decision === "always_allow") {
      return { behavior: "allow" as const, updatedInput: toolInput };
    }
    return { behavior: "deny" as const, message: "Denied by user" };
  };
}

function extractPaths(toolInput: Record<string, unknown>): string[] {
  const paths: string[] = [];
  if (typeof toolInput.file_path === "string") paths.push(toolInput.file_path);
  if (typeof toolInput.path === "string") paths.push(toolInput.path);
  if (typeof toolInput.command === "string") paths.push(toolInput.command);
  return paths;
}

function extractToolResultText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => (typeof c === "object" && c && "text" in c ? (c as { text: string }).text : ""))
      .join("");
  }
  return "";
}

