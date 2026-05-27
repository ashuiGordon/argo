import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { CreateAgentRequest, UpdateAgentRequest, validateMcpServers, validateSkills } from "@argo/shared";
import { getQueries } from "../db/init.js";
import type { Env } from "./types.js";

export const agentRoutes = new Hono<Env>();

function validateAgentConfig(config: Record<string, unknown> | undefined): string[] {
  if (!config) return [];
  const errors: string[] = [];
  if (config.mcpServers && Array.isArray(config.mcpServers)) {
    errors.push(...validateMcpServers(config.mcpServers as never));
  }
  if (config.skills && Array.isArray(config.skills)) {
    errors.push(...validateSkills(config.skills as never));
  }
  return errors;
}

agentRoutes.get("/", (c) => {
  const queries = getQueries();
  const agents = queries.getAgents();
  return c.json({
    agents: agents.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      avatarColor: a.avatar_color,
      systemPrompt: a.system_prompt,
      capabilities: JSON.parse(a.capabilities),
      config: JSON.parse(a.config),
    })),
  });
});

agentRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = CreateAgentRequest.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.issues } }, 400);
  }

  const { name, avatarColor, systemPrompt, capabilities, config } = parsed.data;

  const configErrors = validateAgentConfig(config as Record<string, unknown> | undefined);
  if (configErrors.length > 0) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: configErrors[0], details: configErrors.map((e) => ({ field: "config", issue: e })) } }, 400);
  }

  const id = randomUUID();
  const queries = getQueries();
  queries.createAgent(id, name, "custom", avatarColor, capabilities || [], config || {}, systemPrompt);

  return c.json({ id, name, type: "custom", avatarColor, systemPrompt, capabilities: capabilities || [], config: config || {} }, 201);
});

agentRoutes.put("/:id", async (c) => {
  const { id } = c.req.param();
  const queries = getQueries();
  const existing = queries.getAgent(id);
  if (!existing) return c.json({ error: { code: "NOT_FOUND", message: "Agent not found" } }, 404);
  if (existing.type !== "custom") return c.json({ error: { code: "FORBIDDEN", message: "Cannot edit built-in agents" } }, 403);

  const body = await c.req.json();
  const parsed = UpdateAgentRequest.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.issues } }, 400);
  }

  const configErrors = validateAgentConfig(parsed.data.config as Record<string, unknown> | undefined);
  if (configErrors.length > 0) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: configErrors[0], details: configErrors.map((e) => ({ field: "config", issue: e })) } }, 400);
  }

  queries.updateAgent(id, parsed.data);
  return c.json({ success: true });
});

agentRoutes.delete("/:id", (c) => {
  const { id } = c.req.param();
  const queries = getQueries();
  const existing = queries.getAgent(id);
  if (!existing) return c.json({ error: { code: "NOT_FOUND", message: "Agent not found" } }, 404);
  if (existing.type !== "custom") return c.json({ error: { code: "FORBIDDEN", message: "Cannot delete built-in agents" } }, 403);

  queries.deleteAgent(id);
  return c.json({ success: true });
});
