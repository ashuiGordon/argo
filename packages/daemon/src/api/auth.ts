import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { RegisterRequest, LoginRequest } from "@argo/shared";
import { hashPassword, comparePassword, signToken } from "../auth/index.js";
import { getQueries } from "../db/init.js";

export const authRoutes = new Hono();

authRoutes.post("/register", async (c) => {
  const body = await c.req.json();
  const parsed = RegisterRequest.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.issues } },
      400,
    );
  }

  const { email, password } = parsed.data;
  const queries = getQueries();

  const existing = queries.getUserByEmail(email);
  if (existing) {
    return c.json({ error: { code: "CONFLICT", message: "Email already registered" } }, 409);
  }

  const id = randomUUID();
  const passwordHash = await hashPassword(password);
  queries.createUser(id, email, passwordHash);

  const token = signToken({ userId: id, email });
  return c.json({ token, user: { id, email } }, 201);
});

authRoutes.post("/login", async (c) => {
  const body = await c.req.json();
  const parsed = LoginRequest.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.issues } },
      400,
    );
  }

  const { email, password } = parsed.data;
  const queries = getQueries();

  const user = queries.getUserByEmail(email);
  if (!user) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Invalid credentials" } }, 401);
  }

  const valid = await comparePassword(password, user.password_hash);
  if (!valid) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Invalid credentials" } }, 401);
  }

  const token = signToken({ userId: user.id, email: user.email });
  return c.json({ token, user: { id: user.id, email: user.email } }, 200);
});
