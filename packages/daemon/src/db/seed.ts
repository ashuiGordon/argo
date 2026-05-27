import { randomUUID } from "node:crypto";
import { getQueries } from "./init.js";
import { BUILTIN_AGENTS } from "../agents/builtin-agents.js";
import { BUILTIN_SKILLS } from "../deploy/builtin-skills.js";

export function seedAgents(): void {
  const queries = getQueries();
  const existing = queries.getAgents();

  for (const agent of BUILTIN_AGENTS) {
    const alreadyExists = existing.some(
      (e) => e.name === agent.name && e.role === agent.role,
    );
    if (!alreadyExists) {
      const config: Record<string, unknown> = {};
      if (agent.role === "ops") {
        config.skills = BUILTIN_SKILLS;
      }
      queries.createAgent(
        randomUUID(),
        agent.name,
        agent.type,
        agent.avatarColor,
        agent.capabilities,
        config,
        agent.systemPrompt,
        agent.role,
        agent.model,
        agent.disallowedTools,
      );
    }
  }

  seedDevUser();
}

function seedDevUser(): void {
  const queries = getQueries();
  const existing = queries.getUserById("dev-user");
  if (!existing) {
    queries.createUser("dev-user", "dev@argo.local", "$2b$10$placeholder");
  }
}
