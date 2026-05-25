import { spawn, type ChildProcess } from "node:child_process";
import readline from "node:readline";
import type { NormalizedEvent } from "@argo/shared";
import type { AdapterConfig, AdapterCallbacks, ManagedRuntime } from "../types.js";
import { platform } from "../../platform/index.js";

let requestIdCounter = 1;
function nextId(): number { return requestIdCounter++; }

interface PendingRequest {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
}

export async function launchCodex(
  config: AdapterConfig,
  callbacks: AdapterCallbacks,
  initialMessage?: string,
): Promise<ManagedRuntime> {
  const { sessionId, workspace, conversationId } = config;

  let codexBinary: string;
  try {
    codexBinary = platform.resolveBinary("codex");
  } catch {
    callbacks.onEvent({
      type: "error",
      sessionId,
      message: "codex binary not found on PATH. Install Codex CLI or set ARGO_CODEX_PATH.",
      code: "MISSING_BINARY",
      recoverable: false,
    });
    throw new Error("codex binary not found on PATH");
  }

  const proc = spawn(codexBinary, ["app-server"], {
    cwd: workspace,
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env },
  });

  const pendingRequests = new Map<number, PendingRequest>();
  let currentThreadId: string | null = null;
  let active = true;

  callbacks.onEvent({
    type: "session_start",
    sessionId,
    provider: "codex",
    workspace,
    agentId: "",
    conversationId,
  });

  // Line-based JSON-RPC reader
  const rl = readline.createInterface({ input: proc.stdout!, crlfDelay: Infinity });
  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const msg = JSON.parse(trimmed);
      if ("id" in msg && "result" in msg) {
        const pending = pendingRequests.get(msg.id as number);
        if (pending) {
          pendingRequests.delete(msg.id as number);
          pending.resolve(msg.result);
        }
      } else if ("id" in msg && "error" in msg) {
        const pending = pendingRequests.get(msg.id as number);
        if (pending) {
          pendingRequests.delete(msg.id as number);
          pending.reject(new Error(JSON.stringify(msg.error)));
        }
      } else if ("method" in msg) {
        handleServerRequest(msg, sessionId, callbacks, proc);
      }
    } catch { /* ignore parse errors */ }
  });

  // Stderr
  proc.stderr?.setEncoding("utf8");
  proc.stderr?.on("data", (chunk: string) => {
    const trimmed = chunk.trim();
    if (trimmed) {
      callbacks.onEvent({ type: "error", sessionId, message: trimmed, code: "STDERR", recoverable: true });
    }
  });

  proc.on("close", (code) => {
    active = false;
    for (const [, pending] of pendingRequests) {
      pending.reject(new Error(`codex process exited (code ${code})`));
    }
    pendingRequests.clear();
    callbacks.onEvent({ type: "session_end", sessionId, exitCode: code ?? 1 });
    callbacks.onExit(code);
  });

  function sendRequest(method: string, params: Record<string, unknown>): Promise<unknown> {
    const id = nextId();
    return new Promise((resolve, reject) => {
      pendingRequests.set(id, { resolve, reject });
      const payload = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";
      proc.stdin!.write(payload);
    });
  }

  function sendNotification(method: string, params: Record<string, unknown>): void {
    const payload = JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n";
    proc.stdin!.write(payload);
  }

  // Handshake
  await sendRequest("initialize", {
    clientInfo: { name: "argo", title: "Argo", version: "1.0.0" },
    capabilities: null,
  });
  sendNotification("initialized", {});

  // Start thread
  const threadResult = await sendRequest("thread/start", {
    instructions: config.systemPrompt || "You are a helpful coding assistant.",
    workspacePath: workspace,
  }) as Record<string, unknown>;

  currentThreadId = (threadResult?.threadId ?? threadResult?.thread_id ?? null) as string | null;

  // Send initial message
  if (initialMessage && currentThreadId) {
    sendNotification("turn/start", {
      threadId: currentThreadId,
      userMessage: initialMessage,
    });
  }

  const runtime: ManagedRuntime = {
    async sendMessage(content: string): Promise<void> {
      if (!active || !currentThreadId) throw new Error("Codex runtime is not active");
      sendNotification("turn/start", {
        threadId: currentThreadId,
        userMessage: content,
      });
    },
    terminate(): void {
      if (!active) return;
      active = false;
      try { proc.kill(); } catch { /* already gone */ }
    },
    isActive(): boolean {
      return active;
    },
  };

  return runtime;
}

function handleServerRequest(
  msg: Record<string, unknown>,
  sessionId: string,
  callbacks: AdapterCallbacks,
  proc: ChildProcess,
): void {
  const method = msg.method as string;
  const params = (msg.params ?? {}) as Record<string, unknown>;
  const id = msg.id;

  if (method.includes("requestApproval")) {
    callbacks.onEvent({
      type: "approval_request",
      sessionId,
      approvalId: String(id),
      action: method,
      riskLevel: "high",
      toolName: method,
      proposedAction: params,
      affectedPaths: [],
    });
  }

  // For now auto-approve — full approval integration will come in US3
  if (id !== undefined) {
    const response = JSON.stringify({ jsonrpc: "2.0", id, result: { approved: true } }) + "\n";
    proc.stdin!.write(response);
  }

  // Emit messages from server notifications
  if (method === "message" || method === "turn/message") {
    const content = params.content ?? params.message ?? params.text;
    if (typeof content === "string") {
      callbacks.onEvent({
        type: "message",
        sessionId,
        role: "assistant",
        content,
        streaming: false,
        final: true,
      });
    }
  }
}
