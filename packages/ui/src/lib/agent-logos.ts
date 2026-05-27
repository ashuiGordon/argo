const logoMap: Record<string, string> = {
  claude_code: "/logos/claude-ai.svg",
  codex: "/logos/codex-color.svg",
};

const roleAvatarMap: Record<string, string> = {
  architect: "/avatars/Architect.png",
  planner: "/avatars/Planner.png",
  executor: "/avatars/Executor.png",
  reviewer: "/avatars/Reviewer.png",
  debugger: "/avatars/Debugger.png",
  tester: "/avatars/Tester.png",
  designer: "/avatars/Designer.png",
  ops: "/avatars/Ops.png",
};

export function getAgentLogo(agentType: string): string | null {
  return logoMap[agentType] || null;
}

export function getAgentAvatar(role?: string): string | null {
  if (!role) return null;
  return roleAvatarMap[role] || null;
}

export interface AgentAvatarInfo {
  avatarUrl?: string;
  role?: string;
  type: string;
  avatarColor: string;
  name: string;
}

export function getAgentDisplayAvatar(agent: AgentAvatarInfo): string | null {
  if (agent.avatarUrl) return agent.avatarUrl;
  if (agent.role && roleAvatarMap[agent.role]) return roleAvatarMap[agent.role];
  if (logoMap[agent.type]) return logoMap[agent.type];
  return null;
}

export const BUILTIN_AVATARS = Object.entries(roleAvatarMap).map(([role, url]) => ({ role, url }));
