import { z } from "zod";

export const RegisterRequest = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type RegisterRequest = z.infer<typeof RegisterRequest>;

export const LoginRequest = z.object({
  email: z.string().email(),
  password: z.string(),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

export const AuthResponse = z.object({
  token: z.string(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
  }),
});
export type AuthResponse = z.infer<typeof AuthResponse>;

export const CreateConversationRequest = z.object({
  mode: z.enum(["single", "group"]),
  agentIds: z.array(z.string().uuid()).min(1),
  title: z.string().optional(),
});
export type CreateConversationRequest = z.infer<typeof CreateConversationRequest>;

export const UpdateConversationRequest = z.object({
  title: z.string().optional(),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
});
export type UpdateConversationRequest = z.infer<typeof UpdateConversationRequest>;

export const SendMessageRequest = z.object({
  content: z.string().min(1),
  quotedSequence: z.number().int().optional().nullable(),
});
export type SendMessageRequest = z.infer<typeof SendMessageRequest>;

export const ApprovalDecisionRequest = z.object({
  decision: z.enum(["approve", "deny"]),
});
export type ApprovalDecisionRequest = z.infer<typeof ApprovalDecisionRequest>;

export const AlwaysAllowRequest = z.object({
  toolName: z.string(),
  pattern: z.string().optional(),
});
export type AlwaysAllowRequest = z.infer<typeof AlwaysAllowRequest>;

export const CreateAgentRequest = z.object({
  name: z.string().min(1).max(100),
  avatarColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  systemPrompt: z.string().max(10000).optional(),
  capabilities: z.array(z.string()).optional(),
  config: z.record(z.unknown()).optional(),
});
export type CreateAgentRequest = z.infer<typeof CreateAgentRequest>;

export const UpdateAgentRequest = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  systemPrompt: z.string().max(10000).optional(),
  capabilities: z.array(z.string()).optional(),
  config: z.record(z.unknown()).optional(),
});
export type UpdateAgentRequest = z.infer<typeof UpdateAgentRequest>;

export const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});
export type PaginationQuery = z.infer<typeof PaginationQuery>;

export const EventsQuery = z.object({
  afterSequence: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
});
export type EventsQuery = z.infer<typeof EventsQuery>;

export const ApiError = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z
      .array(z.object({ field: z.string(), issue: z.string() }))
      .optional(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;
