import { AgentAvatar } from "./agent-avatar";

interface AgentInfo {
  name: string;
  type: string;
  avatarColor: string;
  avatarUrl?: string;
  role?: string;
}

interface AgentAvatarGroupProps {
  agents: AgentInfo[];
  size?: number;
}

export function AgentAvatarGroup({ agents, size = 32 }: AgentAvatarGroupProps) {
  if (agents.length === 0) return null;

  if (agents.length === 1) {
    return <AgentAvatar agent={agents[0]} size={size} />;
  }

  const display = agents.slice(0, 4);
  const innerSize = size * 0.55;

  if (display.length === 2) {
    return (
      <div
        className="relative shrink-0 rounded-full overflow-hidden bg-gray-200"
        style={{ width: size, height: size }}
      >
        <div className="absolute top-0 left-0 w-1/2 h-full overflow-hidden">
          <AgentAvatar agent={display[0]} size={size} className="!rounded-none" />
        </div>
        <div className="absolute top-0 right-0 w-1/2 h-full overflow-hidden">
          <div style={{ marginLeft: -size / 2 }}>
            <AgentAvatar agent={display[1]} size={size} className="!rounded-none" />
          </div>
        </div>
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white" />
      </div>
    );
  }

  if (display.length === 3) {
    return (
      <div
        className="relative shrink-0 rounded-full overflow-hidden bg-gray-200"
        style={{ width: size, height: size }}
      >
        {/* Top center */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2" style={{ width: innerSize, height: innerSize }}>
          <AgentAvatar agent={display[0]} size={innerSize} />
        </div>
        {/* Bottom left */}
        <div className="absolute bottom-0 left-0" style={{ width: innerSize, height: innerSize }}>
          <AgentAvatar agent={display[1]} size={innerSize} />
        </div>
        {/* Bottom right */}
        <div className="absolute bottom-0 right-0" style={{ width: innerSize, height: innerSize }}>
          <AgentAvatar agent={display[2]} size={innerSize} />
        </div>
      </div>
    );
  }

  // 4+ agents: 2x2 grid
  const cellSize = size / 2 - 1;
  return (
    <div
      className="shrink-0 grid grid-cols-2 gap-px rounded-full overflow-hidden bg-gray-200"
      style={{ width: size, height: size }}
    >
      {display.map((agent, i) => (
        <AgentAvatar key={i} agent={agent} size={cellSize} className="!rounded-none" />
      ))}
    </div>
  );
}
