import type { RiskLevel } from "@argo/shared";

const CRITICAL_TOOLS = new Set(["Bash"]);
const CRITICAL_PATTERNS = [/rm\s+-rf/, /drop\s+table/i, /delete\s+from/i, /git\s+push\s+--force/];

const HIGH_RISK_TOOLS = new Set(["Write", "Edit"]);
const HIGH_PATTERNS = [/\.env/, /credentials/, /secret/, /password/];

const MEDIUM_TOOLS = new Set(["Bash"]);

export function classifyRisk(toolName: string, input: Record<string, unknown>): RiskLevel {
  const inputStr = JSON.stringify(input);

  if (CRITICAL_TOOLS.has(toolName)) {
    for (const pattern of CRITICAL_PATTERNS) {
      if (pattern.test(inputStr)) return "critical";
    }
  }

  if (HIGH_RISK_TOOLS.has(toolName)) {
    for (const pattern of HIGH_PATTERNS) {
      if (pattern.test(inputStr)) return "high";
    }
    return "medium";
  }

  if (MEDIUM_TOOLS.has(toolName)) {
    for (const pattern of HIGH_PATTERNS) {
      if (pattern.test(inputStr)) return "high";
    }
    return "medium";
  }

  return "low";
}
