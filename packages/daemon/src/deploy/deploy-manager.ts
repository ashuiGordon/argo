import { randomUUID } from "node:crypto";
import { getQueries } from "../db/init.js";
import { eventBus } from "../event-bus/index.js";
import type { DeployAdapter, DeployRequest, DeployResult } from "./types.js";
import { PreviewAdapter, StaticSiteAdapter, ContainerAdapter, PackageAdapter } from "./adapters/index.js";
import type { DeployType, DeployTarget } from "@argo/shared";

class DeployManager {
  private adapters: DeployAdapter[] = [
    new PreviewAdapter(),
    new StaticSiteAdapter(),
    new ContainerAdapter(),
    new PackageAdapter(),
  ];

  private getAdapter(type: DeployType): DeployAdapter | undefined {
    return this.adapters.find((a) => a.type === type);
  }

  async createDeployment(params: {
    conversationId: string;
    type: DeployType;
    target: DeployTarget;
    workspace: string;
    sessionId?: string;
    buildCommand?: string;
  }): Promise<{ id: string }> {
    const adapter = this.getAdapter(params.type);
    if (!adapter) {
      throw new Error(`No adapter for deploy type: ${params.type}`);
    }
    if (!adapter.supportedTargets.includes(params.target)) {
      throw new Error(`Target "${params.target}" not supported for type "${params.type}"`);
    }

    const id = randomUUID();
    const queries = getQueries();

    queries.createDeployment(
      id,
      params.conversationId,
      params.type,
      params.target,
      params.workspace,
      params.sessionId,
      params.buildCommand ? { buildCommand: params.buildCommand } : undefined,
    );

    this.emitStatus(id, params.conversationId, params.sessionId, params.type, "pending", params.target);

    this.runDeployment(id, params, adapter);

    return { id };
  }

  private async runDeployment(
    id: string,
    params: { conversationId: string; type: DeployType; target: DeployTarget; workspace: string; sessionId?: string; buildCommand?: string },
    adapter: DeployAdapter,
  ) {
    const queries = getQueries();
    const logs: string[] = [];

    try {
      queries.updateDeploymentStatus(id, "building");
      this.emitStatus(id, params.conversationId, params.sessionId, params.type, "building", params.target);

      const request: DeployRequest = {
        id,
        conversationId: params.conversationId,
        sessionId: params.sessionId,
        type: params.type,
        target: params.target,
        workspace: params.workspace,
        buildCommand: params.buildCommand,
      };

      const result: DeployResult = await adapter.execute(request, (line) => {
        logs.push(line);
      });

      queries.updateDeploymentStatus(id, result.status, result.url, { logs: result.logs, ...result.metadata });
      this.emitStatus(id, params.conversationId, params.sessionId, params.type, result.status, params.target, result.url, result.error, result.logs.slice(-5));
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : "Unknown error";
      queries.updateDeploymentStatus(id, "failed", undefined, { logs, error });
      this.emitStatus(id, params.conversationId, params.sessionId, params.type, "failed", params.target, undefined, error);
    }
  }

  private emitStatus(
    deploymentId: string,
    conversationId: string,
    sessionId: string | undefined,
    deployType: DeployType,
    status: string,
    target: string,
    url?: string,
    error?: string,
    logs?: string[],
  ) {
    const queries = getQueries();
    const event = {
      type: "deploy_status" as const,
      sessionId: sessionId || "system",
      deploymentId,
      deployType,
      status,
      target,
      url,
      error,
      logs,
    };
    const seq = queries.appendEvent(event.sessionId, conversationId, "deploy_status", JSON.stringify(event));
    eventBus.emit("event", event as never, seq, conversationId);
  }

  async cancelDeployment(id: string): Promise<void> {
    const queries = getQueries();
    const deployment = queries.getDeployment(id);
    if (!deployment) throw new Error("Deployment not found");
    if (deployment.status !== "pending" && deployment.status !== "building") {
      throw new Error("Cannot cancel a completed deployment");
    }

    const adapter = this.getAdapter(deployment.type as DeployType);
    if (adapter?.cleanup) {
      await adapter.cleanup(id);
    }

    queries.updateDeploymentStatus(id, "cancelled");
    this.emitStatus(
      id,
      deployment.conversation_id,
      deployment.session_id || undefined,
      deployment.type as DeployType,
      "cancelled",
      deployment.target,
    );
  }

  getDeployment(id: string) {
    const queries = getQueries();
    const row = queries.getDeployment(id);
    if (!row) return null;
    return this.mapRow(row);
  }

  getDeployments(conversationId: string) {
    const queries = getQueries();
    return queries.getDeployments(conversationId).map(this.mapRow);
  }

  private mapRow(row: { id: string; conversation_id: string; session_id: string | null; type: string; status: string; target: string; url: string | null; workspace: string; metadata: string; created_at: string; updated_at: string }) {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      sessionId: row.session_id || undefined,
      type: row.type,
      status: row.status,
      target: row.target,
      url: row.url || undefined,
      workspace: row.workspace,
      metadata: JSON.parse(row.metadata || "{}"),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const deployManager = new DeployManager();
