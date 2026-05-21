import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { registerExternalSession } from "./register.js";

const POLL_INTERVAL_MS = 10_000;
const CLAUDE_SESSIONS_DIR = join(homedir(), ".claude", "sessions");

const knownPids = new Set<number>();
let pollTimer: ReturnType<typeof setInterval> | null = null;

export function startClaudeDiscovery(): void {
  if (pollTimer) return;
  pollTimer = setInterval(discoverSessions, POLL_INTERVAL_MS);
  discoverSessions();
}

export function stopClaudeDiscovery(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function discoverSessions(): void {
  if (!existsSync(CLAUDE_SESSIONS_DIR)) return;

  try {
    const entries = readdirSync(CLAUDE_SESSIONS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;

      const filePath = join(CLAUDE_SESSIONS_DIR, entry.name);
      try {
        const content = readFileSync(filePath, "utf-8");
        const session = JSON.parse(content) as {
          pid?: number;
          workspace?: string;
          sessionId?: string;
        };

        if (!session.pid || !session.workspace) continue;
        if (knownPids.has(session.pid)) continue;
        if (!isPidAlive(session.pid)) continue;

        knownPids.add(session.pid);
        registerExternalSession({
          externalId: session.sessionId || entry.name.replace(".json", ""),
          provider: "claude_code",
          workspace: session.workspace,
          pid: session.pid,
        });
      } catch {
        // Skip malformed session files
      }
    }
  } catch {
    // Directory read failed
  }

  for (const pid of knownPids) {
    if (!isPidAlive(pid)) {
      knownPids.delete(pid);
    }
  }
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
