import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CreateAgentRequest, UpdateAgentRequest, validateMcpServers, validateSkills } from "@argo/shared";
import { getQueries } from "../db/init.js";
import type { Env } from "./types.js";

const __dirname = resolve(fileURLToPath(import.meta.url), "../../../..");
const AVATAR_DIR = resolve(__dirname, "../ui/public/avatars/custom");

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
      avatarUrl: a.avatar_url || undefined,
      systemPrompt: a.system_prompt,
      role: a.role,
      model: a.model,
      disallowedTools: a.disallowed_tools ? JSON.parse(a.disallowed_tools) : undefined,
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

  const { name, avatarColor, systemPrompt, role, model, disallowedTools, capabilities, config } = parsed.data;

  const configErrors = validateAgentConfig(config as Record<string, unknown> | undefined);
  if (configErrors.length > 0) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: configErrors[0], details: configErrors.map((e) => ({ field: "config", issue: e })) } }, 400);
  }

  const id = randomUUID();
  const queries = getQueries();
  queries.createAgent(id, name, "custom", avatarColor, capabilities || [], config || {}, systemPrompt, role, model, disallowedTools);

  return c.json({ id, name, type: "custom", avatarColor, systemPrompt, role, model, disallowedTools, capabilities: capabilities || [], config: config || {} }, 201);
});

agentRoutes.put("/:id", async (c) => {
  const { id } = c.req.param();
  const queries = getQueries();
  const existing = queries.getAgent(id);
  if (!existing) return c.json({ error: { code: "NOT_FOUND", message: "Agent not found" } }, 404);

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

agentRoutes.post("/:id/avatar", async (c) => {
  const { id } = c.req.param();
  const queries = getQueries();
  const existing = queries.getAgent(id);
  if (!existing) return c.json({ error: { code: "NOT_FOUND", message: "Agent not found" } }, 404);

  const body = await c.req.parseBody();
  const file = body["file"];
  if (!file || !(file instanceof File)) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "No file provided" } }, 400);
  }

  const ext = file.name.split(".").pop() || "png";
  const filename = `${id}.${ext}`;
  const avatarUrl = `/avatars/custom/${filename}`;

  if (!existsSync(AVATAR_DIR)) {
    mkdirSync(AVATAR_DIR, { recursive: true });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(resolve(AVATAR_DIR, filename), buffer);

  queries.updateAgentAvatarUrl(id, avatarUrl);
  return c.json({ avatarUrl });
});
