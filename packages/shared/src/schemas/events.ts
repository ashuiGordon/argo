import { z } from "zod";

export const RiskLevel = z.enum(["critical", "high", "medium", "low"]);
export type RiskLevel = z.infer<typeof RiskLevel>;

export const TaskStatus = z.enum([
  "pending",
  "blocked",
  "in_progress",
  "completed",
  "failed",
  "skipped",
]);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const Provider = z.enum(["claude_code", "codex"]);
export type Provider = z.infer<typeof Provider>;

const BaseEvent = z.object({
  sessionId: z.string().uuid(),
});

export const SessionStartEvent = BaseEvent.extend({
  type: z.literal("session_start"),
  provider: Provider,
  workspace: z.string(),
  agentId: z.string().uuid(),
  conversationId: z.string().uuid(),
});

export const SessionEndEvent = BaseEvent.extend({
  type: z.literal("session_end"),
  exitCode: z.number().int(),
});

export const MessageEvent = BaseEvent.extend({
  type: z.literal("message"),
  role: z.enum(["assistant", "user"]),
  content: z.string(),
  streaming: z.boolean().default(false),
  final: z.boolean().default(true),
});

export const ToolUseEvent = BaseEvent.extend({
  type: z.literal("tool_use"),
  tool: z.string(),
  input: z.record(z.unknown()),
});

export const ToolResultEvent = BaseEvent.extend({
  type: z.literal("tool_result"),
  tool: z.string(),
  output: z.string(),
  success: z.boolean(),
});

export const ApprovalRequestEvent = BaseEvent.extend({
  type: z.literal("approval_request"),
  approvalId: z.string().uuid(),
  action: z.string(),
  riskLevel: RiskLevel,
  toolName: z.string(),
  proposedAction: z.record(z.unknown()),
  affectedPaths: z.array(z.string()).optional(),
});

export const ApprovalResolvedEvent = BaseEvent.extend({
  type: z.literal("approval_resolved"),
  approvalId: z.string().uuid(),
  decision: z.enum(["approve", "deny"]),
  decidedBy: z.enum(["user", "timeout", "auto_rule"]),
});

export const TaskStatusEvent = BaseEvent.extend({
  type: z.literal("task_status"),
  taskId: z.string().uuid(),
  status: TaskStatus,
  title: z.string(),
  assignee: z.string().optional(),
  result: z
    .object({ output: z.string().optional(), tokensUsed: z.number().optional() })
    .optional(),
});

export const ErrorEvent = BaseEvent.extend({
  type: z.literal("error"),
  message: z.string(),
  code: z.string(),
  recoverable: z.boolean().default(true),
});

export const UsageEvent = BaseEvent.extend({
  type: z.literal("usage"),
  inputTokens: z.number().int(),
  outputTokens: z.number().int(),
  cacheReadTokens: z.number().int().optional(),
  cacheWriteTokens: z.number().int().optional(),
});

export const StreamingDeltaEvent = BaseEvent.extend({
  type: z.literal("streaming_delta"),
  delta: z.string(),
  blockIndex: z.number().int().default(0),
});

export const TokenUsageEvent = BaseEvent.extend({
  type: z.literal("token_usage"),
  provider: Provider,
  model: z.string().optional(),
  inputTokens: z.number().int(),
  outputTokens: z.number().int(),
  totalTokens: z.number().int(),
  cachedInputTokens: z.number().int().default(0),
  contextUsedTokens: z.number().int().optional(),
  contextWindowTokens: z.number().int().optional(),
  contextPercent: z.number().optional(),
});

export const HookEventType = z.enum([
  "SessionStart", "SessionEnd",
  "PreToolUse", "PostToolUse",
  "PermissionRequest", "PermissionDenied",
  "Elicitation", "ElicitationResult",
  "SubagentStart", "SubagentStop",
  "Notification", "Stop",
]);
export type HookEventType = z.infer<typeof HookEventType>;

export const HookEvent = BaseEvent.extend({
  type: z.literal("hook_event"),
  hookType: HookEventType,
  hookPayload: z.record(z.unknown()),
});

export const NormalizedEvent = z.discriminatedUnion("type", [
  SessionStartEvent,
  SessionEndEvent,
  MessageEvent,
  ToolUseEvent,
  ToolResultEvent,
  ApprovalRequestEvent,
  ApprovalResolvedEvent,
  TaskStatusEvent,
  ErrorEvent,
  UsageEvent,
  StreamingDeltaEvent,
  TokenUsageEvent,
  HookEvent,
]);
export type NormalizedEvent = z.infer<typeof NormalizedEvent>;

export type SessionStartEvent = z.infer<typeof SessionStartEvent>;
export type SessionEndEvent = z.infer<typeof SessionEndEvent>;
export type MessageEvent = z.infer<typeof MessageEvent>;
export type ToolUseEvent = z.infer<typeof ToolUseEvent>;
export type ToolResultEvent = z.infer<typeof ToolResultEvent>;
export type ApprovalRequestEvent = z.infer<typeof ApprovalRequestEvent>;
export type ApprovalResolvedEvent = z.infer<typeof ApprovalResolvedEvent>;
export type TaskStatusEvent = z.infer<typeof TaskStatusEvent>;
export type ErrorEvent = z.infer<typeof ErrorEvent>;
export type UsageEvent = z.infer<typeof UsageEvent>;
export type StreamingDeltaEvent = z.infer<typeof StreamingDeltaEvent>;
export type TokenUsageEvent = z.infer<typeof TokenUsageEvent>;
export type HookEvent = z.infer<typeof HookEvent>;
