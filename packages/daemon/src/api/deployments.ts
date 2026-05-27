import { Hono } from "hono";
import { CreateDeploymentRequest } from "@argo/shared";
import { deployManager } from "../deploy/deploy-manager.js";
import { getQueries } from "../db/init.js";
import type { Env } from "./types.js";
import { existsSync } from "node:fs";

export const deployRoutes = new Hono<Env>();

deployRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = CreateDeploymentRequest.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } }, 400);
  }

  const { conversationId, type, target, workspace, buildCommand, sessionId } = parsed.data;

  try {
    const result = await deployManager.createDeployment({
      conversationId,
      type,
      target,
      workspace,
      sessionId,
      buildCommand,
    });
    return c.json({ id: result.id, status: "pending" }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Deploy failed";
    return c.json({ error: { code: "DEPLOY_ERROR", message } }, 400);
  }
});

deployRoutes.get("/:id", (c) => {
  const id = c.req.param("id");
  const deployment = deployManager.getDeployment(id);
  if (!deployment) {
    return c.json({ error: { code: "NOT_FOUND", message: "Deployment not found" } }, 404);
  }
  return c.json({ deployment });
});

deployRoutes.get("/", (c) => {
  const conversationId = c.req.query("conversation_id");
  if (!conversationId) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "conversation_id required" } }, 400);
  }
  const deployments = deployManager.getDeployments(conversationId);
  return c.json({ deployments });
});

deployRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  try {
    await deployManager.cancelDeployment(id);
    return c.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Cancel failed";
    return c.json({ error: { code: "CANCEL_ERROR", message } }, 400);
  }
});

deployRoutes.get("/download/:deploymentId/:filename", async (c) => {
  const { deploymentId, filename } = c.req.param();
  const queries = getQueries();
  const deployment = queries.getDeployment(deploymentId);
  if (!deployment) {
    return c.json({ error: { code: "NOT_FOUND", message: "Deployment not found" } }, 404);
  }

  const metadata = JSON.parse(deployment.metadata || "{}");
  const filePath = metadata.filePath;
  if (!filePath || !existsSync(filePath)) {
    return c.json({ error: { code: "NOT_FOUND", message: "File not found" } }, 404);
  }

  const { readFileSync } = await import("node:fs");
  const buffer = readFileSync(filePath);
  const contentType = filename.endsWith(".zip") ? "application/zip" : "application/gzip";

  return new Response(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
});
