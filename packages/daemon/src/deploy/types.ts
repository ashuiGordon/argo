import type { DeployType, DeployTarget, DeployStatus } from "@argo/shared";

export interface DeployRequest {
  id: string;
  conversationId: string;
  sessionId?: string;
  type: DeployType;
  target: DeployTarget;
  workspace: string;
  buildCommand?: string;
}

export interface DeployResult {
  status: DeployStatus;
  url?: string;
  error?: string;
  logs: string[];
  metadata?: Record<string, unknown>;
}

export interface DeployAdapter {
  readonly type: DeployType;
  readonly supportedTargets: DeployTarget[];
  execute(request: DeployRequest, onLog: (line: string) => void): Promise<DeployResult>;
  cleanup?(deploymentId: string): Promise<void>;
}
