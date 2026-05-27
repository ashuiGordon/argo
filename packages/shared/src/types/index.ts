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

export type AgentRole = "architect" | "planner" | "executor" | "reviewer" | "debugger" | "tester" | "designer" | "ops";

export type AgentModel = "opus" | "sonnet" | "haiku";

export interface Agent {
  id: string;
  name: string;
  type: "claude_code" | "codex" | "custom";
  avatarColor: string;
  avatarUrl?: string;
  systemPrompt?: string;
  role?: AgentRole;
  model?: AgentModel;
  disallowedTools?: string[];
  capabilities: string[];
  config: AgentConfig;
  createdAt: string;
}

export interface PipelineStage {
  name: string;
  assignTo: AgentRole;
  description: string;
  canSkip: boolean;
}

export interface TeamPreset {
  id: string;
  name: string;
  description: string;
  roles: AgentRole[];
  pipeline: PipelineStage[];
  moderatorHint: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  mode: "single" | "group";
  moderatorAgentId?: string;
  teamPresetId?: string;
  pinned: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationWithDetails extends Conversation {
  agents: Pick<Agent, "id" | "name" | "type" | "avatarColor" | "avatarUrl" | "role">[];
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

export type DeployType = "preview" | "static" | "container" | "package";
export type DeployStatus = "pending" | "building" | "deployed" | "failed" | "cancelled";
export type DeployTarget = "local" | "vercel" | "netlify" | "docker" | "fly" | "zip" | "tar";

export interface Deployment {
  id: string;
  conversationId: string;
  sessionId?: string;
  type: DeployType;
  status: DeployStatus;
  target: DeployTarget;
  url?: string;
  workspace: string;
  metadata?: {
    logs?: string[];
    error?: string;
    buildCommand?: string;
    framework?: string;
    port?: number;
    imageTag?: string;
    filename?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type ServerMessage =
  | { type: "event"; payload: unknown; sequence: number }
  | { type: "catchup_complete"; lastSequence: number }
  | { type: "error"; message: string; code: string };

export type ClientMessage =
  | { type: "subscribe"; conversationId: string }
  | { type: "unsubscribe"; conversationId: string };
