import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { PORTS } from "@argo/shared";

type HookHandler = (sessionId: string, event: unknown) => void;
let hookHandler: HookHandler | null = null;

export function setHookHandler(handler: HookHandler) {
  hookHandler = handler;
}

export function startHookServer(): void {
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== "POST") {
      res.writeHead(405);
      res.end();
      return;
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const sessionId = req.headers["x-session-id"] as string || data.sessionId || "";

        if (hookHandler) {
          hookHandler(sessionId, data);
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
  });

  server.listen(PORTS.HOOK_SERVER, () => {
    console.log(`Hook server listening on http://localhost:${PORTS.HOOK_SERVER}`);
  });
}
