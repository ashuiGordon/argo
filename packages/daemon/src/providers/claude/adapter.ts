import { spawn, type ChildProcess } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { PORTS } from "@argo/shared";
import type { NormalizedEvent } from "@argo/shared";
import { parseStreamJsonLine } from "./parser.js";
import { EventPersistence } from "../../event-bus/persist.js";
import { getQueries } from "../../db/init.js";
import { registerSession, unregisterSession } from "../../hook-server/index.js";

export interface ClaudeSession {
  sessionId: string;
  process: ChildProcess;
  conversationId: string;
}

const activeSessions = new Map<string, ClaudeSession>();
const claudeSessionIds = new Map<string, string>();

function generateSettingsFile(sessionId: string): string {
  const dir = join(tmpdir(), "argo-hooks");
  mkdirSync(dir, { recursive: true });

  const hookScriptPath = join(dir, `hook-${sessionId}.sh`);
  const hookScript = `#!/bin/bash
INPUT=$(cat /dev/stdin)
RESPONSE=$(curl -s -X POST http://localhost:${PORTS.HOOK_SERVER}/approve \\
  -H "Content-Type: application/json" \\
  -d "$INPUT" 2>/dev/null)
DECISION=$(echo "$RESPONSE" | grep -o '"permissionDecision":"[^"]*"' | cut -d'"' -f4)
if [ "$DECISION" = "deny" ]; then
  echo "Operation denied by Argo approval system" >&2
  exit 2
fi
exit 0
`;
  writeFileSync(hookScriptPath, hookScript, { mode: 0o755 });

  const settingsPath = join(dir, `settings-${sessionId}.json`);
  const settings = {
    hooks: {
      PreToolUse: [
        {
          matcher: "*",
          hooks: [
            {
              type: "command",
              command: hookScriptPath,
              timeout: 65,
            },
          ],
        },
      ],
    },
  };

  writeFileSync(settingsPath, JSON.stringify(settings), "utf-8");
  return settingsPath;
}

export function spawnClaudeCode(
  conversationId: string,
  prompt: string,
  workspace: string,
  systemPrompt?: string,
): ClaudeSession {
  const sessionId = randomUUID();
  const settingsFile = generateSettingsFile(sessionId);
  const persistence = new EventPersistence(getQueries());

  const sessionKey = systemPrompt
    ? `${conversationId}:${systemPrompt.slice(0, 50)}`
    : conversationId;
  const existingClaudeSessionId = claudeSessionIds.get(sessionKey);

  const args = [
    "--print",
    "--output-format", "stream-json",
    "--verbose",
    "--settings", settingsFile,
  ];

  let claudeSessionId: string;
  if (existingClaudeSessionId) {
    claudeSessionId = existingClaudeSessionId;
    args.push("--resume", claudeSessionId);
  } else {
    claudeSessionId = randomUUID();
    claudeSessionIds.set(sessionKey, claudeSessionId);
    args.push("--session-id", claudeSessionId);
  }

  if (systemPrompt) {
    args.push("--system-prompt", systemPrompt);
  }
  args.push(prompt);

  const proc = spawn("claude", args, {
    cwd: workspace,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });

  const queries = getQueries();
  queries.createSession(sessionId, "claude_code", conversationId, workspace, proc.pid);
  queries.updateSessionStatus(sessionId, "running");

  registerSession(claudeSessionId, conversationId, sessionId);

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
    unregisterSession(claudeSessionId);
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
