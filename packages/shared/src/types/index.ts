export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface Agent {
  id: string;
  name: string;
  type: "claude_code" | "codex" | "custom";
  avatarColor: string;
  systemPrompt?: string;
  capabilities: string[];
  config: Record<string, unknown>;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  mode: "single" | "group";
  pinned: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationWithDetails extends Conversation {
  agents: Pick<Agent, "id" | "name" | "avatarColor">[];
  lastMessage?: { content: string; timestamp: string };
  unreadCount: number;
}

export interface StoredEvent {
  sequenceNumber: number;
  sessionId: string;
  conversationId: string;
  type: string;
  payload: string;
  timestamp: string;
}

export interface Session {
  sessionId: string;
  externalId?: string;
  provider: "claude_code" | "codex";
  conversationId: string;
  workspace: string;
  status: "starting" | "running" | "stopped" | "crashed";
  isExternal: boolean;
  pid?: number;
  createdAt: string;
}

export interface Approval {
  approvalId: string;
  sessionId: string;
  conversationId: string;
  status: "pending" | "approved" | "denied" | "timeout";
  actionType: string;
  riskLevel: "critical" | "high" | "medium" | "low";
  proposedAction: Record<string, unknown>;
  affectedPaths?: string[];
  createdAt: string;
  decidedAt?: string;
}

export interface Task {
  id: string;
  conversationId: string;
  title: string;
  description: string;
  assignee: string;
  dependsOn: string[];
  status: "pending" | "blocked" | "in_progress" | "completed" | "failed" | "skipped";
  result?: { output?: string; tokensUsed?: number };
  error?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  completedAt?: string;
}

export type ServerMessage =
  | { type: "event"; payload: unknown; sequence: number }
  | { type: "catchup_complete"; lastSequence: number }
  | { type: "pty_output"; sessionId: string; data: string }
  | { type: "error"; message: string; code: string };

export type ClientMessage =
  | { type: "subscribe"; conversationId: string }
  | { type: "unsubscribe"; conversationId: string }
  | { type: "pty_input"; sessionId: string; data: string };
