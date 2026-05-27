export const PORTS = {
  DAEMON: 54321,
  UI_DEV: 5173,
} as const;

export const EVENT_TYPES = [
  "session_start",
  "session_end",
  "message",
  "tool_use",
  "tool_result",
  "approval_request",
  "approval_resolved",
  "task_status",
  "error",
  "usage",
] as const;

export const RISK_LEVELS = ["critical", "high", "medium", "low"] as const;

export const TASK_STATUSES = [
  "pending",
  "blocked",
  "in_progress",
  "completed",
  "failed",
  "skipped",
] as const;

export const PROVIDERS = ["claude_code", "codex"] as const;

export const APPROVAL_TIMEOUT_MS = 60_000;
export const MAX_PARALLEL_TASKS = 5;
export const WS_HEARTBEAT_INTERVAL_MS = 30_000;
export const WS_RECONNECT_BASE_MS = 1_000;
export const WS_RECONNECT_MAX_MS = 30_000;

export const RESERVED_SKILL_NAMES = new Set([
  "help", "clear", "compact", "config", "cost", "doctor",
  "init", "login", "logout", "mcp", "memory", "model",
  "permissions", "review", "status", "terminal", "vim", "fast",
]);

export const MCP_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
export const SKILL_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
export const MAX_SKILL_PROMPT_LENGTH = 10_000;
export const MAX_MCP_SERVERS_PER_AGENT = 20;
export const MAX_SKILLS_PER_AGENT = 50;

import type { McpServerConfig, SkillConfig } from "../types/index.js";

export function validateMcpServers(servers: McpServerConfig[]): string[] {
  const errors: string[] = [];
  const names = new Set<string>();

  if (servers.length > MAX_MCP_SERVERS_PER_AGENT) {
    errors.push(`Maximum ${MAX_MCP_SERVERS_PER_AGENT} MCP servers allowed`);
    return errors;
  }

  for (let i = 0; i < servers.length; i++) {
    const s = servers[i];
    if (!s.name || !MCP_NAME_PATTERN.test(s.name)) {
      errors.push(`mcpServers[${i}].name: must be lowercase alphanumeric with hyphens`);
    }
    if (names.has(s.name)) {
      errors.push(`mcpServers[${i}].name: duplicate name '${s.name}'`);
    }
    names.add(s.name);
    if (!s.command?.trim()) {
      errors.push(`mcpServers[${i}].command: required`);
    }
  }

  return errors;
}

export function validateSkills(skills: SkillConfig[]): string[] {
  const errors: string[] = [];
  const names = new Set<string>();

  if (skills.length > MAX_SKILLS_PER_AGENT) {
    errors.push(`Maximum ${MAX_SKILLS_PER_AGENT} skills allowed`);
    return errors;
  }

  for (let i = 0; i < skills.length; i++) {
    const s = skills[i];
    if (!s.name || !SKILL_NAME_PATTERN.test(s.name)) {
      errors.push(`skills[${i}].name: must be lowercase alphanumeric with hyphens`);
    }
    if (RESERVED_SKILL_NAMES.has(s.name)) {
      errors.push(`skills[${i}].name: '${s.name}' is reserved`);
    }
    if (names.has(s.name)) {
      errors.push(`skills[${i}].name: duplicate name '${s.name}'`);
    }
    names.add(s.name);
    if (!s.description?.trim()) {
      errors.push(`skills[${i}].description: required`);
    }
    if (!s.prompt?.trim()) {
      errors.push(`skills[${i}].prompt: required`);
    }
    if (s.prompt && s.prompt.length > MAX_SKILL_PROMPT_LENGTH) {
      errors.push(`skills[${i}].prompt: exceeds ${MAX_SKILL_PROMPT_LENGTH} character limit`);
    }
  }

  return errors;
}
