export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface McpServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface SkillConfig {
  name: string;
  description: string;
  prompt: string;
}

export interface AgentConfig {
  mcpServers?: McpServerConfig[];
  skills?: SkillConfig[];
  [key: string]: unknown;
}

export interface Agent {
  id: string;
  name: string;
  type: "claude_code" | "codex" | "custom";
  avatarColor: string;
  systemPrompt?: string;
  capabilities: string[];
  config: AgentConfig;
  createdAt: string;
}

export type ArgoPhase = "clarify" | "specify" | "plan" | "tasks" | "implement" | "review" | "commit" | "done";

export interface ArgoState {
  phase: ArgoPhase;
  featureDir: string;
  clarifyDone: boolean;
  artifacts: {
    spec?: boolean;
    plan?: boolean;
    tasks?: boolean;
  };
  implementProgress?: {
    total: number;
    completed: number;
  };
  reviewResult?: "pass" | "fail";
  error?: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  mode: "single" | "group" | "argo";
  moderatorAgentId?: string;
  argoState?: ArgoState | null;
  pinned: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationWithDetails extends Conversation {
  agents: Pick<Agent, "id" | "name" | "type" | "avatarColor">[];
  lastMessage?: { content: string; timestamp: string };
  unreadCount: number;
  workspace?: string | null;
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
  provider: "claude_code" | "codex";
  conversationId: string;
  workspace: string;
  status: "starting" | "running" | "stopped" | "crashed";
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
  | { type: "error"; message: string; code: string };

export type ClientMessage =
  | { type: "subscribe"; conversationId: string }
  | { type: "unsubscribe"; conversationId: string };
