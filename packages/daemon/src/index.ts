import { createAdaptorServer } from "@hono/node-server";
import { PORTS } from "@argo/shared";
import { createApi } from "./api/index.js";
import { setupWebSocket } from "./ws/index.js";
import { getDb } from "./db/init.js";
import { seedAgents } from "./db/seed.js";
import { markCrashedSessionsOnStartup, terminateAllSessions } from "./session/session-store.js";

async function main() {
  getDb();
  seedAgents();
  markCrashedSessionsOnStartup();

  const app = createApi();
  app.onError((err, c) => {
    console.error("[API Error]", c.req.method, c.req.path, err.message, err.stack?.split("\n").slice(0, 3).join("\n"));
    return c.text("Internal Server Error", 500);
  });

  const server = createAdaptorServer({ fetch: app.fetch, port: PORTS.DAEMON });
  const wss = setupWebSocket(server as unknown as import("node:http").Server);

  server.listen(PORTS.DAEMON, () => {
    console.log(`Argo daemon listening on http://localhost:${PORTS.DAEMON}`);
    console.log(`WebSocket available at ws://localhost:${PORTS.DAEMON}/ws`);
  });

  const shutdown = () => {
    console.log("Shutting down gracefully...");
    terminateAllSessions();
    wss.close();
    server.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Failed to start daemon:", err);
  process.exit(1);
});
