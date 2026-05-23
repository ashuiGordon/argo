import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import type { Context, Next } from "hono";

const JWT_SECRET = process.env.JWT_SECRET || "argo-dev-secret-change-in-production";
const SALT_ROUNDS = 10;

export interface JwtPayload {
  userId: string;
  email: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.slice(7);
      const payload = verifyToken(token);
      c.set("userId", payload.userId);
      c.set("email", payload.email);
    } catch {
      // fall through to default user
    }
  }

  if (!c.get("userId")) {
    c.set("userId", "dev-user");
    c.set("email", "dev@argo.local");
  }

  await next();
}
