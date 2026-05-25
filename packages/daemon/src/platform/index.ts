import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const binaryCache = new Map<string, string>();

export function resolveBinary(name: string): string {
  const cached = binaryCache.get(name);
  if (cached) return cached;

  const configuredPath = process.env[`ARGO_${name.toUpperCase()}_PATH`];
  if (configuredPath && existsSync(configuredPath)) {
    binaryCache.set(name, configuredPath);
    return configuredPath;
  }

  try {
    const resolved = execSync(`which ${name}`, { encoding: "utf-8" }).trim();
    if (resolved) {
      binaryCache.set(name, resolved);
      return resolved;
    }
  } catch {
    // which failed — binary not on PATH
  }

  throw new Error(`Binary '${name}' not found on PATH. Set ARGO_${name.toUpperCase()}_PATH to configure manually.`);
}

export function getLoginShell(): string {
  return process.env.SHELL || "/bin/bash";
}

export function buildPtySpawnArgs(command: string): { shell: string; args: string[] } {
  const shell = getLoginShell();
  return {
    shell,
    args: ["-l", "-c", command],
  };
}

export function defaultSpawnOptions(): { env: Record<string, string | undefined> } {
  return {
    env: { ...process.env },
  };
}

export const platform = {
  resolveBinary,
  getLoginShell,
  buildPtySpawnArgs,
  defaultSpawnOptions,
};
