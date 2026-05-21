import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { NormalizedEvent } from "@argo/shared";
import { parseStreamJsonLine } from "./parser.js";
import { generateHookScript } from "./hook-script.js";
import { EventPersistence } from "../../event-bus/persist.js";
import { getQueries } from "../../db/init.js";

export interface ClaudeSession {
  sessionId: string;
  process: ChildProcess;
  conversationId: string;
}

const activeSessions = new Map<string, ClaudeSession>();

export function spawnClaudeCode(
  conversationId: string,
  prompt: string,
  workspace: string,
  systemPrompt?: string,
): ClaudeSession {
  const sessionId = randomUUID();
  const hookScript = generateHookScript(sessionId);
  const persistence = new EventPersistence(getQueries());

  const args = [
    "--print",
    "--output-format", "stream-json",
    "--verbose",
  ];
  if (systemPrompt) {
    args.push("--system-prompt", systemPrompt);
  }
  args.push(prompt);

  const proc = spawn("claude", args, {
    cwd: workspace,
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      CLAUDE_CODE_HOOK_AFTER_TOOL_USE: `node ${hookScript}`,
    },
  });

  const queries = getQueries();
  queries.createSession(sessionId, "claude_code", conversationId, workspace, proc.pid);
  queries.updateSessionStatus(sessionId, "running");

  const startEvent: NormalizedEvent = {
    type: "session_start",
    sessionId,
    provider: "claude_code",
    workspace,
    agentId: getClaudeAgentId(),
    conversationId,
  };
  persistence.persist(startEvent, conversationId);

  let buffer = "";
  proc.stdout?.on("data", (chunk: Buffer) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const event = parseStreamJsonLine(sessionId, line);
      if (event) {
        persistence.persist(event, conversationId);
      }
    }
  });

  proc.stderr?.on("data", (chunk: Buffer) => {
    const text = chunk.toString().trim();
    if (text) {
      const errorEvent: NormalizedEvent = {
        type: "error",
        sessionId,
        message: text,
        code: "STDERR",
        recoverable: true,
      };
      persistence.persist(errorEvent, conversationId);
    }
  });

  proc.on("close", (code) => {
    if (buffer.trim()) {
      const event = parseStreamJsonLine(sessionId, buffer);
      if (event) persistence.persist(event, conversationId);
    }

    const endEvent: NormalizedEvent = {
      type: "session_end",
      sessionId,
      exitCode: code ?? 1,
    };
    persistence.persist(endEvent, conversationId);
    queries.updateSessionStatus(sessionId, code === 0 ? "stopped" : "crashed");
    activeSessions.delete(sessionId);
  });

  const session: ClaudeSession = { sessionId, process: proc, conversationId };
  activeSessions.set(sessionId, session);
  return session;
}

export function sendToSession(sessionId: string, input: string): boolean {
  const session = activeSessions.get(sessionId);
  if (!session || !session.process.stdin?.writable) return false;
  session.process.stdin.write(input + "\n");
  return true;
}

export function killSession(sessionId: string): void {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.process.kill("SIGTERM");
  }
}

function getClaudeAgentId(): string {
  const queries = getQueries();
  const agents = queries.getAgents();
  const claude = agents.find((a) => a.type === "claude_code");
  return claude?.id || "";
}
