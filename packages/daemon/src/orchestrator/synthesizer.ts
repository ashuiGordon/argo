import type { OrchestratorTask } from "./task-queue.js";

export function synthesizeResults(tasks: OrchestratorTask[]): string {
  const completed = tasks.filter((t) => t.status === "completed");
  const failed = tasks.filter((t) => t.status === "failed");
  const skipped = tasks.filter((t) => t.status === "skipped");

  let summary = `## Orchestration Complete\n\n`;
  summary += `**${completed.length}** completed, **${failed.length}** failed, **${skipped.length}** skipped\n\n`;

  if (completed.length > 0) {
    summary += `### Completed\n`;
    for (const task of completed) {
      summary += `- ✓ **${task.title}** (${task.assignee})`;
      if (task.result?.output) {
        summary += `\n  ${task.result.output.slice(0, 200)}`;
      }
      summary += `\n`;
    }
    summary += `\n`;
  }

  if (failed.length > 0) {
    summary += `### Failed\n`;
    for (const task of failed) {
      summary += `- ✗ **${task.title}**: ${task.error || "unknown error"}\n`;
    }
    summary += `\n`;
  }

  if (skipped.length > 0) {
    summary += `### Skipped\n`;
    for (const task of skipped) {
      summary += `- ○ **${task.title}**\n`;
    }
  }

  return summary;
}
