import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { PORTS } from "@argo/shared";

export function generateHookScript(sessionId: string): string {
  const dir = join(tmpdir(), "argo-hooks");
  mkdirSync(dir, { recursive: true });

  const scriptPath = join(dir, `hook-${sessionId}.cjs`);
  const script = `
const http = require('http');

const data = JSON.stringify({
  ...JSON.parse(process.env.CLAUDE_HOOK_EVENT || '{}'),
  sessionId: '${sessionId}'
});

const req = http.request({
  hostname: 'localhost',
  port: ${PORTS.HOOK_SERVER},
  path: '/',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Session-Id': '${sessionId}',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  res.resume();
  res.on('end', () => process.exit(0));
});

req.on('error', () => process.exit(0));
req.write(data);
req.end();
`.trim();

  writeFileSync(scriptPath, script, "utf-8");
  return scriptPath;
}
