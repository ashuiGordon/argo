import { createAdaptorServer } from "@hono/node-server";
import { PORTS } from "@argo/shared";
import { createApi } from "./api/index.js";
import { setupWebSocket } from "./ws/index.js";
import { getDb } from "./db/init.js";
import { seedAgents } from "./db/seed.js";
import { startHookServer } from "./hook-server/index.js";
import { startClaudeDiscovery } from "./discovery/claude-discovery.js";

async function main() {
  getDb();
  seedAgents();

  const app = createApi();

  const server = createAdaptorServer({ fetch: app.fetch, port: PORTS.DAEMON });
  setupWebSocket(server as unknown as import("node:http").Server);

  server.listen(PORTS.DAEMON, () => {
    console.log(`Argo daemon listening on http://localhost:${PORTS.DAEMON}`);
    console.log(`WebSocket available at ws://localhost:${PORTS.DAEMON}/ws`);
  });

  startHookServer();
  startClaudeDiscovery();
}

main().catch((err) => {
  console.error("Failed to start daemon:", err);
  process.exit(1);
});
