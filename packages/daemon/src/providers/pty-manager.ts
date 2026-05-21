import * as pty from "node-pty";
import { platform } from "node:os";
import { broadcastToConversation } from "../ws/index.js";
import { getQueries } from "../db/init.js";

interface PtySession {
  id: string;
  sessionId: string;
  conversationId: string;
  ptyProcess: pty.IPty;
}

const ptySessions = new Map<string, PtySession>();

export function createPtySession(
  sessionId: string,
  conversationId: string,
  cwd: string,
): PtySession {
  const shell = platform() === "win32" ? "powershell.exe" : process.env.SHELL || "/bin/bash";

  const ptyProcess = pty.spawn(shell, [], {
    name: "xterm-256color",
    cols: 120,
    rows: 30,
    cwd,
    env: process.env as Record<string, string>,
  });

  const session: PtySession = {
    id: ptyProcess.pid.toString(),
    sessionId,
    conversationId,
    ptyProcess,
  };

  ptyProcess.onData((data) => {
    broadcastToConversation(conversationId, {
      type: "pty_output",
      sessionId,
      data,
    });
  });

  ptyProcess.onExit(({ exitCode }) => {
    ptySessions.delete(sessionId);
    const queries = getQueries();
    queries.updateSessionStatus(sessionId, exitCode === 0 ? "stopped" : "crashed");
  });

  ptySessions.set(sessionId, session);
  return session;
}

export function writeToPty(sessionId: string, data: string): void {
  const session = ptySessions.get(sessionId);
  if (session) {
    session.ptyProcess.write(data);
  }
}

export function resizePty(sessionId: string, cols: number, rows: number): void {
  const session = ptySessions.get(sessionId);
  if (session) {
    session.ptyProcess.resize(cols, rows);
  }
}

export function destroyPty(sessionId: string): void {
  const session = ptySessions.get(sessionId);
  if (session) {
    session.ptyProcess.kill();
    ptySessions.delete(sessionId);
  }
}

export function getPtySession(sessionId: string): PtySession | undefined {
  return ptySessions.get(sessionId);
}
