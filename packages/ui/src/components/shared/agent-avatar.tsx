import { getAgentDisplayAvatar } from "../../lib/agent-logos";

interface AgentAvatarProps {
  agent: {
    name: string;
    type: string;
    avatarColor: string;
    avatarUrl?: string;
    role?: string;
  };
  size?: number;
  className?: string;
}

export function AgentAvatar({ agent, size = 32, className = "" }: AgentAvatarProps) {
  const src = getAgentDisplayAvatar(agent);

  if (src) {
    return (
      <img
        src={src}
        alt={agent.name}
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: agent.avatarColor,
        fontSize: size * 0.35,
      }}
    >
      {agent.name[0]}
    </div>
  );
}
