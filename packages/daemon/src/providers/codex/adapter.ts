import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { NormalizedEvent } from "@argo/shared";
import { EventPersistence } from "../../event-bus/persist.js";
import { getQueries } from "../../db/init.js";
import { parseCodexMessage } from "./parser.js";

export interface CodexSession {
  sessionId: string;
  process: ChildProcess;
  conversationId: string;
}

const activeSessions = new Map<string, CodexSession>();

export function spawnCodex(
  conversationId: string,
  prompt: string,
  workspace: string,
): CodexSession {
  const sessionId = randomUUID();
  const persistence = new EventPersistence(getQueries());
  const queries = getQueries();

  const proc = spawn("codex", ["--quiet", prompt], {
    cwd: workspace,
    stdio: ["pipe", "pipe", "pipe"],
  });

  queries.createSession(sessionId, "codex", conversationId, workspace, proc.pid);
  queries.updateSessionStatus(sessionId, "running");

  const startEvent: NormalizedEvent = {
    type: "session_start",
    sessionId,
    provider: "codex",
    workspace,
    agentId: getCodexAgentId(),
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
      const event = parseCodexMessage(sessionId, line);
      if (event) {
        persistence.persist(event, conversationId);
      }
    }
  });

  proc.stderr?.on("data", (chunk: Buffer) => {
    const text = chunk.toString().trim();
    if (text) {
      persistence.persist(
        { type: "error", sessionId, message: text, code: "STDERR", recoverable: true },
        conversationId,
      );
    }
  });

  proc.on("close", (code) => {
    if (buffer.trim()) {
      const event = parseCodexMessage(sessionId, buffer);
      if (event) persistence.persist(event, conversationId);
    }

    persistence.persist(
      { type: "session_end", sessionId, exitCode: code ?? 1 },
      conversationId,
    );
    queries.updateSessionStatus(sessionId, code === 0 ? "stopped" : "crashed");
    activeSessions.delete(sessionId);
  });

  const session: CodexSession = { sessionId, process: proc, conversationId };
  activeSessions.set(sessionId, session);
  return session;
}

function getCodexAgentId(): string {
  const queries = getQueries();
  const agents = queries.getAgents();
  const codex = agents.find((a) => a.type === "codex");
  return codex?.id || "";
}
