import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { PORTS } from "@argo/shared";
import { classifyRisk } from "../approval/risk-classifier.js";
import { handleApprovalHook } from "./approval-handler.js";

interface SessionMapping {
  conversationId: string;
  internalSessionId?: string;
}

const sessionMap = new Map<string, SessionMapping>();

export function registerSession(claudeSessionId: string, conversationId: string, internalSessionId?: string): void {
  sessionMap.set(claudeSessionId, { conversationId, internalSessionId });
}

export function unregisterSession(sessionId: string): void {
  sessionMap.delete(sessionId);
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
        const toolName: string = data.tool_name || "";
        const toolInput: Record<string, unknown> = data.tool_input || {};
        const sessionId: string = data.session_id || "";

        const mapping = sessionMap.get(sessionId);
        if (!mapping) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            hookSpecificOutput: {
              hookEventName: "PreToolUse",
              permissionDecision: "allow",
            },
          }));
          return;
        }

        const riskLevel = classifyRisk(toolName, toolInput);

        if (riskLevel === "low") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            hookSpecificOutput: {
              hookEventName: "PreToolUse",
              permissionDecision: "allow",
            },
          }));
          return;
        }

        const decision = await handleApprovalHook(
          mapping.internalSessionId || sessionId,
          mapping.conversationId,
          toolName,
          toolInput,
          toolInput.file_path ? [toolInput.file_path as string] : undefined,
        );

        res.writeHead(200, { "Content-Type": "application/json" });
        if (decision === "approve") {
          res.end(JSON.stringify({
            hookSpecificOutput: {
              hookEventName: "PreToolUse",
              permissionDecision: "allow",
            },
          }));
        } else {
          res.end(JSON.stringify({
            hookSpecificOutput: {
              hookEventName: "PreToolUse",
              permissionDecision: "deny",
              permissionDecisionReason: "Operation denied by user or timed out",
            },
          }));
        }
      } catch {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "allow",
          },
        }));
      }
    });
  });

  server.listen(PORTS.HOOK_SERVER, () => {
    console.log(`Hook server listening on http://localhost:${PORTS.HOOK_SERVER}`);
  });
}
