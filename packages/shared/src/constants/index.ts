export const PORTS = {
  DAEMON: 54321,
  HOOK_SERVER: 54322,
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
