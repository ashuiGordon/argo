import type { NormalizedEvent } from "@argo/shared";

export type AdapterMode = "headless" | "pty";
export type SessionStatus = "starting" | "running" | "idle" | "stopped" | "crashed";
export type ProviderType = "claude_code" | "codex";
export type ApprovalDecision = "approve" | "deny" | "always_allow";

export interface AdapterConfig {
  workspace: string;
  sessionId: string;
  conversationId: string;
  mode: AdapterMode;
  systemPrompt?: string;
  model?: string;
  permissionMode?: "default" | "trust";
}

export interface ManagedRuntime {
  sendMessage(content: string): Promise<void>;
  terminate(): void;
  isActive(): boolean;
}

export interface TokenUsageSnapshot {
  model?: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedInputTokens: number;
  contextUsedTokens?: number;
  contextWindowTokens?: number;
  contextPercent?: number;
}

export interface AdapterCallbacks {
  onEvent(event: NormalizedEvent): void;
  onExit(code: number | null): void;
  onUsageUpdate?(usage: TokenUsageSnapshot): void;
}

export interface Adapter {
  start(config: AdapterConfig, callbacks: AdapterCallbacks): Promise<ManagedRuntime>;
}
