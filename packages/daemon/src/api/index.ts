import { Hono } from "hono";
import { cors } from "hono/cors";
import { authMiddleware } from "../auth/index.js";
import { authRoutes } from "./auth.js";
import { conversationRoutes } from "./conversations.js";
import { agentRoutes } from "./agents.js";
import { messageRoutes } from "./messages.js";
import { approvalRoutes } from "./approvals.js";
import { sessionRoutes } from "./sessions.js";
import { pinRoutes } from "./pins.js";
import { systemRoutes } from "./system.js";
import { deployRoutes } from "./deployments.js";
import { getAllPresets } from "../orchestrator/team-presets.js";
import type { Env } from "./types.js";

export function createApi() {
  const app = new Hono<Env>();

  app.use("*", cors());

  app.route("/api/auth", authRoutes);

  app.use("/api/*", authMiddleware);

  app.route("/api/conversations", conversationRoutes);
  app.route("/api/conversations/:id/messages", messageRoutes);
  app.route("/api/pins", pinRoutes);
  app.route("/api/agents", agentRoutes);
  app.route("/api/approvals", approvalRoutes);
  app.route("/api/sessions", sessionRoutes);
  app.route("/api/system", systemRoutes);
  app.route("/api/deployments", deployRoutes);

  app.get("/api/team-presets", (c) => c.json({ presets: getAllPresets() }));
  app.get("/api/health", (c) => c.json({ status: "ok" }));

  return app;
}
