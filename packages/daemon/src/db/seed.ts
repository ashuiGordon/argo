import { randomUUID } from "node:crypto";
import { getQueries } from "./init.js";

const BUILTIN_AGENTS = [
  {
    name: "Claude Code",
    type: "claude_code",
    avatarColor: "#E87040",
    capabilities: ["code", "bash", "files", "web"],
    config: {},
  },
  {
    name: "Codex",
    type: "codex",
    avatarColor: "#10B981",
    capabilities: ["code", "bash"],
    config: {},
  },
];

export function seedAgents(): void {
  const queries = getQueries();
  const existing = queries.getAgents();

  for (const agent of BUILTIN_AGENTS) {
    const alreadyExists = existing.some((e) => e.type === agent.type && e.name === agent.name);
    if (!alreadyExists) {
      queries.createAgent(
        randomUUID(),
        agent.name,
        agent.type,
        agent.avatarColor,
        agent.capabilities,
        agent.config,
      );
    }
  }
}
