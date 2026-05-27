const STATE_CHANGING_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);

const STATE_CHANGING_COMMANDS = [
  "npm install", "pnpm install", "yarn add", "pip install",
  "git commit", "git push", "git merge", "git rebase",
  "mkdir", "rm ", "mv ", "cp ",
  "docker ", "kubectl ",
  "chmod", "chown",
];

const SKIP_TOOLS = new Set([
  "Read", "Glob", "Grep", "WebSearch", "WebFetch",
  "Agent", "TodoWrite", "AskUserQuestion",
  "PushNotification", "CronCreate", "CronDelete", "CronList",
  "Monitor", "TaskOutput", "TaskStop",
]);

export function extractObservation(hookPayload: Record<string, unknown>): string | null {
  const toolName = (hookPayload.tool_name as string) || "";
  const toolInput = (hookPayload.tool_input as Record<string, unknown>) || {};

  if (SKIP_TOOLS.has(toolName)) return null;

  if (STATE_CHANGING_TOOLS.has(toolName)) {
    const filePath = (toolInput.file_path as string) || (toolInput.path as string) || "";
    if (!filePath) return null;
    const shortPath = filePath.split("/").slice(-3).join("/");
    return `Modified file: ${shortPath}`;
  }

  if (toolName === "Bash") {
    const command = (toolInput.command as string) || "";
    if (!command) return null;

    const isStateChanging = STATE_CHANGING_COMMANDS.some((prefix) => command.includes(prefix));
    if (!isStateChanging) return null;

    const shortCmd = command.length > 100 ? command.slice(0, 100) + "..." : command;
    return `Ran: ${shortCmd}`;
  }

  return null;
}
