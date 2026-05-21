import type { OrchestratorTask } from "./task-queue.js";

export interface RawTask {
  title: string;
  description: string;
  assignee: string;
  dependsOn: string[];
}

export function resolveDependencies(rawTasks: RawTask[], idMap: Map<string, string>): OrchestratorTask[] {
  const titleToId = new Map<string, string>();
  const tasks: OrchestratorTask[] = [];

  for (const [index, raw] of rawTasks.entries()) {
    const id = idMap.get(raw.title) || `task-${index}`;
    titleToId.set(raw.title, id);
  }

  for (const [index, raw] of rawTasks.entries()) {
    const id = titleToId.get(raw.title) || `task-${index}`;
    const resolvedDeps = raw.dependsOn
      .map((dep) => titleToId.get(dep))
      .filter(Boolean) as string[];

    tasks.push({
      id,
      title: raw.title,
      description: raw.description,
      assignee: raw.assignee,
      dependsOn: resolvedDeps,
      status: "pending",
      retryCount: 0,
      maxRetries: 2,
    });
  }

  return tasks;
}
