import { execSync } from "node:child_process";
import { existsSync, appendFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function isGitRepo(dir: string): boolean {
  try {
    execSync("git rev-parse --is-inside-work-tree", { cwd: dir, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

export function getCurrentBranch(dir: string): string {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { cwd: dir, stdio: "pipe" })
      .toString()
      .trim();
  } catch {
    return "HEAD";
  }
}

export function getRepoRoot(dir: string): string {
  return execSync("git rev-parse --show-toplevel", { cwd: dir, stdio: "pipe" })
    .toString()
    .trim();
}

export function ensureWorktreeGitIgnore(workspace: string): void {
  const gitignorePath = join(workspace, ".gitignore");
  const entry = ".argo/";

  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, "utf-8");
    if (content.includes(entry)) return;
    appendFileSync(gitignorePath, `\n${entry}\n`);
  } else {
    appendFileSync(gitignorePath, `${entry}\n`);
  }
}

export function gitExec(cmd: string, cwd: string): string {
  return execSync(cmd, { cwd, stdio: "pipe", timeout: 30_000 }).toString().trim();
}
