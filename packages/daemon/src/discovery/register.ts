import { randomUUID } from "node:crypto";
import { getQueries } from "../db/init.js";
import { EventPersistence } from "../event-bus/persist.js";
import type { NormalizedEvent } from "@argo/shared";

interface ExternalSessionInfo {
  externalId: string;
  provider: "claude_code" | "codex";
  workspace: string;
  pid: number;
}

export function registerExternalSession(info: ExternalSessionInfo): string {
  const queries = getQueries();

  const existing = queries.findSessionByExternalId(info.externalId);
  if (existing) return existing.session_id;

  const conversationId = randomUUID();
  const sessionId = randomUUID();

  queries.createConversation(conversationId, getSystemUserId(), `External: ${info.workspace.split("/").pop()}`, "single");
  queries.createExternalSession(sessionId, info.externalId, info.provider, conversationId, info.workspace, info.pid);

  const persistence = new EventPersistence(queries);
  const event: NormalizedEvent = {
    type: "session_start",
    sessionId,
    provider: info.provider,
    workspace: info.workspace,
    agentId: "",
    conversationId,
  };
  persistence.persist(event, conversationId);

  return sessionId;
}

function getSystemUserId(): string {
  const queries = getQueries();
  const users = queries.getUsers();
  return users[0]?.id || "system";
}
