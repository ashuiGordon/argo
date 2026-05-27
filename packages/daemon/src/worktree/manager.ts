import { join } from "node:path";
import { mkdirSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { isGitRepo, getCurrentBranch, getRepoRoot, ensureWorktreeGitIgnore, gitExec } from "./utils.js";

export interface WorktreeInfo {
  path: string;
  branch: string;
  sessionId: string;
  conversationId: string;
  baseBranch: string;
}

export interface CreateWorktreeOpts {
  workspace: string;
  sessionId: string;
  agentName: string;
  conversationId: string;
}

export interface MergeResult {
  success: boolean;
  conflicts?: string[];
}

class WorktreeManager {
  private active = new Map<string, WorktreeInfo>();

  create(opts: CreateWorktreeOpts): WorktreeInfo {
    const { workspace, sessionId, agentName, conversationId } = opts;

    if (!isGitRepo(workspace)) {
      throw new Error(`Not a git repository: ${workspace}`);
    }

    const repoRoot = getRepoRoot(workspace);
    const baseBranch = getCurrentBranch(repoRoot);
    const shortId = randomUUID().slice(0, 8);
    const safeName = agentName.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const branch = `argo/${safeName}-${shortId}`;

    const worktreeDir = join(repoRoot, ".argo", "worktrees", sessionId);
    mkdirSync(join(repoRoot, ".argo", "worktrees"), { recursive: true });
    ensureWorktreeGitIgnore(repoRoot);

    // Stash any uncommitted changes so the worktree starts from a clean base
    const hasChanges = gitExec("git status --porcelain", repoRoot).length > 0;
    const stashRef = hasChanges
      ? gitExec("git stash create", repoRoot)
      : "";

    try {
      gitExec(`git worktree add "${worktreeDir}" -b "${branch}"`, repoRoot);
    } catch (err) {
      throw new Error(`Failed to create worktree: ${err}`);
    }

    // If there were uncommitted changes, apply them to the worktree so agents see the current state
    if (stashRef) {
      try {
        gitExec(`git stash apply ${stashRef}`, worktreeDir);
      } catch {
        // If apply fails (unlikely for a fresh branch), just continue with clean state
      }
    }

    const info: WorktreeInfo = {
      path: worktreeDir,
      branch,
      sessionId,
      conversationId,
      baseBranch,
    };

    this.active.set(worktreeDir, info);
    return info;
  }

  merge(worktreePath: string, targetBranch?: string): MergeResult {
    const info = this.active.get(worktreePath);
    if (!info) {
      return { success: false, conflicts: ["Worktree not found in active set"] };
    }

    const repoRoot = getRepoRoot(worktreePath);
    const target = targetBranch || info.baseBranch;

    // First, commit any uncommitted changes in the worktree
    const worktreeStatus = gitExec("git status --porcelain", worktreePath);
    if (worktreeStatus.length > 0) {
      try {
        gitExec("git add -A", worktreePath);
        gitExec(`git commit -m "argo: auto-commit from agent ${info.branch}"`, worktreePath);
      } catch {
        // Nothing to commit is fine
      }
    }

    // Check if there are actually any new commits on the branch
    try {
      const diffCount = gitExec(
        `git rev-list --count "${target}..${info.branch}"`,
        repoRoot,
      );
      if (diffCount === "0") {
        return { success: true };
      }
    } catch {
      // If comparison fails, try merge anyway
    }

    // Merge from the main worktree (repo root)
    try {
      gitExec(`git merge "${info.branch}" --no-edit`, repoRoot);
      return { success: true };
    } catch (err) {
      // Parse conflict info
      try {
        const conflictOutput = gitExec("git diff --name-only --diff-filter=U", repoRoot);
        const conflicts = conflictOutput.split("\n").filter(Boolean);

        // Abort the failed merge
        try {
          gitExec("git merge --abort", repoRoot);
        } catch { /* already resolved or no merge in progress */ }

        return { success: false, conflicts };
      } catch {
        try {
          gitExec("git merge --abort", repoRoot);
        } catch { /* noop */ }
        return { success: false, conflicts: [`Merge failed: ${err}`] };
      }
    }
  }

  remove(worktreePath: string): void {
    const info = this.active.get(worktreePath);
    if (!info) return;

    const repoRoot = getRepoRoot(worktreePath);

    try {
      gitExec(`git worktree remove "${worktreePath}" --force`, repoRoot);
    } catch {
      // Already removed or not found
    }

    try {
      gitExec(`git branch -D "${info.branch}"`, repoRoot);
    } catch {
      // Branch already deleted
    }

    this.active.delete(worktreePath);
  }

  list(workspace?: string): WorktreeInfo[] {
    if (workspace) {
      return Array.from(this.active.values()).filter(
        (w) => w.path.startsWith(workspace) || w.conversationId === workspace,
      );
    }
    return Array.from(this.active.values());
  }

  listGitWorktrees(workspace: string): Array<{ path: string; branch: string; head: string }> {
    if (!isGitRepo(workspace)) return [];

    try {
      const output = gitExec("git worktree list --porcelain", workspace);
      const worktrees: Array<{ path: string; branch: string; head: string }> = [];
      let current: { path: string; branch: string; head: string } = { path: "", branch: "", head: "" };

      for (const line of output.split("\n")) {
        if (line.startsWith("worktree ")) {
          if (current.path) worktrees.push(current);
          current = { path: line.slice(9), branch: "", head: "" };
        } else if (line.startsWith("HEAD ")) {
          current.head = line.slice(5);
        } else if (line.startsWith("branch ")) {
          current.branch = line.slice(7).replace("refs/heads/", "");
        }
      }
      if (current.path) worktrees.push(current);

      return worktrees.filter((w) => w.branch.startsWith("argo/"));
    } catch {
      return [];
    }
  }

  get(worktreePath: string): WorktreeInfo | undefined {
    return this.active.get(worktreePath);
  }
}

let instance: WorktreeManager | null = null;

export function getWorktreeManager(): WorktreeManager {
  if (!instance) {
    instance = new WorktreeManager();
  }
  return instance;
}
