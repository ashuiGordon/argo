import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { PORTS } from "@argo/shared";
import { classifyRisk } from "../approval/risk-classifier.js";
import { createApprovalRequest, resolveApproval as dualResolve } from "../approval/dual-channel.js";
import { EventPersistence } from "../event-bus/persist.js";
import { getQueries } from "../db/init.js";
import { ALLOWED_TOOLS } from "../adapters/claude/hook-relay.js";
import type { NormalizedEvent } from "@argo/shared";

interface SessionMapping {
  conversationId: string;
  internalSessionId: string;
}

const sessionMap = new Map<string, SessionMapping>();

export function registerSession(claudeSessionId: string, conversationId: string, internalSessionId: string): void {
  sessionMap.set(claudeSessionId, { conversationId, internalSessionId });
}

export function unregisterSession(sessionId: string): void {
  sessionMap.delete(sessionId);
}

function extractPaths(toolInput: Record<string, unknown>): string[] {
  const paths: string[] = [];
  if (typeof toolInput.file_path === "string") paths.push(toolInput.file_path);
  if (typeof toolInput.path === "string") paths.push(toolInput.path);
  if (typeof toolInput.command === "string") paths.push(toolInput.command);
  return paths;
}

export function startHookServer(): void {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== "POST") {
      res.writeHead(405);
      res.end();
      return;
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const data = JSON.parse(body);
        const hookEventName: string = data.hook_event_name || "";
        const claudeSessionId: string = data.session_id || "";
        const toolName: string = data.tool_name || "";
        const toolInput: Record<string, unknown> = data.tool_input || {};

        const urlParts = req.url?.split("/") || [];
        const sessionIdFromUrl = urlParts[urlParts.length - 1] || "";

        const mapping = sessionMap.get(claudeSessionId) || sessionMap.get(sessionIdFromUrl);

        if (!mapping) {
          if (hookEventName === "PreToolUse") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "allow" } }));
          } else {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true }));
          }
          return;
        }

        const { conversationId, internalSessionId } = mapping;
        const persistence = new EventPersistence(getQueries());

        if (hookEventName === "PreToolUse") {
          const riskLevel = classifyRisk(toolName, toolInput);

          if (riskLevel === "low" || ALLOWED_TOOLS.has(toolName)) {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "allow" } }));
            return;
          }

          const affectedPaths = extractPaths(toolInput);
          const reason = `Tool '${toolName}' classified as ${riskLevel} risk`;
          const { promise } = createApprovalRequest(
            internalSessionId,
            conversationId,
            toolName,
            toolInput,
            riskLevel,
            affectedPaths,
            reason,
          );

          const decision = await promise;

          res.writeHead(200, { "Content-Type": "application/json" });
          if (decision === "approve" || decision === "always_allow") {
            res.end(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "allow" } }));
          } else {
            res.end(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: "Denied by user or timed out" } }));
          }
          return;
        }

        // Non-blocking hooks: emit event and respond immediately
        const hookEvent: NormalizedEvent = {
          type: "hook_event",
          sessionId: internalSessionId,
          hookType: hookEventName as NormalizedEvent extends { type: "hook_event" } ? NormalizedEvent["hookType"] : never,
          hookPayload: data,
        };
        persistence.persist(hookEvent, conversationId);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      }
    });
  });

  server.listen(PORTS.HOOK_SERVER, () => {
    console.log(`[Argo] Hook server listening on port ${PORTS.HOOK_SERVER}`);
  });
}
