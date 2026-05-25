const logoMap: Record<string, string> = {
  claude_code: "/logos/claude-ai.svg",
  codex: "/logos/codex-color.svg",
};

export function getAgentLogo(agentType: string): string | null {
  return logoMap[agentType] || null;
}
