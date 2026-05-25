import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PORTS } from "@argo/shared";

const HOOK_TIMEOUT_S = 60;
const HOOK_TIMEOUT_MS = (HOOK_TIMEOUT_S - 5) * 1000;

const ALL_HOOK_TYPES = [
  "SessionStart", "SessionEnd",
  "PreToolUse", "PostToolUse",
  "PermissionRequest", "PermissionDenied",
  "Elicitation", "ElicitationResult",
  "SubagentStart", "SubagentStop",
  "Notification", "Stop",
] as const;

export const ALLOWED_TOOLS: ReadonlySet<string> = new Set([
  "Read", "Glob", "Grep", "Write", "Edit", "MultiEdit",
  "Agent", "AskUserQuestion", "TodoWrite",
]);

export interface HookRelayPaths {
  relayScriptPath: string;
  settingsPath: string;
}

export function generateHookRelay(sessionId: string): HookRelayPaths {
  const dir = path.join(os.tmpdir(), "argo-hooks");
  fs.mkdirSync(dir, { recursive: true });

  const relayScriptPath = path.join(dir, `hook-relay-${sessionId}.cjs`);
  const hookHost = process.env.ARGO_HOOK_HOST ?? "127.0.0.1";
  const hookUrl = `http://${hookHost}:${PORTS.HOOK_SERVER}/hooks/${sessionId}`;

  const relayScript = [
    `"use strict";`,
    `const http = require("node:http");`,
    `const { URL } = require("node:url");`,
    ``,
    `const target = process.argv[2];`,
    `const timeoutMs = Number(process.argv[3] || "${HOOK_TIMEOUT_MS}");`,
    `if (!target) process.exit(2);`,
    ``,
    `let body = "";`,
    `process.stdin.setEncoding("utf8");`,
    `process.stdin.on("data", (chunk) => { body += chunk; });`,
    `process.stdin.on("end", () => {`,
    `  const url = new URL(target);`,
    `  const request = http.request({`,
    `    hostname: url.hostname,`,
    `    port: url.port || 80,`,
    `    path: url.pathname + url.search,`,
    `    method: "POST",`,
    `    headers: {`,
    `      "content-type": "application/json",`,
    `      "content-length": Buffer.byteLength(body),`,
    `    },`,
    `  }, (response) => {`,
    `    let respBody = "";`,
    `    response.on("data", (chunk) => { respBody += chunk; });`,
    `    response.on("end", () => {`,
    `      process.stdout.write(respBody);`,
    `      const status = response.statusCode || 500;`,
    `      process.exit(status >= 200 && status < 300 ? 0 : 1);`,
    `    });`,
    `  });`,
    `  request.setTimeout(timeoutMs, () => {`,
    `    request.destroy(new Error("timeout"));`,
    `  });`,
    `  request.on("error", () => process.exit(1));`,
    `  request.write(body);`,
    `  request.end();`,
    `});`,
    `process.stdin.on("error", () => process.exit(1));`,
    `process.stdin.resume();`,
    ``,
  ].join("\n");

  fs.writeFileSync(relayScriptPath, relayScript, "utf8");

  const hookCmd = `"${process.execPath}" "${relayScriptPath}" "${hookUrl}" "${HOOK_TIMEOUT_MS}"`;

  const hookEntry = (matcher?: string) => ({
    ...(matcher !== undefined ? { matcher } : {}),
    hooks: [{ type: "command" as const, command: hookCmd, timeout: HOOK_TIMEOUT_S }],
  });

  const settings: Record<string, unknown> = {
    hooks: Object.fromEntries(
      ALL_HOOK_TYPES.map((hookType) => {
        if (hookType === "PreToolUse" || hookType === "PostToolUse" || hookType === "PermissionRequest" || hookType === "PermissionDenied") {
          return [hookType, [hookEntry("")]];
        }
        return [hookType, [hookEntry()]];
      }),
    ),
  };

  const settingsPath = path.join(dir, `settings-${sessionId}.json`);
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf8");

  return { relayScriptPath, settingsPath };
}

export function cleanupHookRelay(paths: HookRelayPaths): void {
  try { fs.unlinkSync(paths.relayScriptPath); } catch { /* ignore */ }
  try { fs.unlinkSync(paths.settingsPath); } catch { /* ignore */ }
}
