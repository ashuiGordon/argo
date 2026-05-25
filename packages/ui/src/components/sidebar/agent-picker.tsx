import { useEffect, useState } from "react";
import { api } from "../../services/api-client";
import { getAgentLogo } from "../../lib/agent-logos";

interface Agent {
  id: string;
  name: string;
  type: string;
  avatarColor: string;
  capabilities: string[];
}

export function AgentPicker({ onSelect, onClose }: { onSelect: (agentId: string) => void; onClose: () => void }) {
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    api.agents.list().then((res) => setAgents(res.agents as Agent[]));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="w-full max-w-md rounded-[var(--radius-md)] border border-gray-200 bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Select Agent</h2>
        <div className="space-y-2">
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => onSelect(agent.id)}
              className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] border border-gray-200 p-3 text-left hover:border-gray-300 hover:bg-gray-50 cursor-pointer"
            >
              {(() => {
                const logo = getAgentLogo(agent.type);
                return logo ? (
                  <img src={logo} alt={agent.name} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: agent.avatarColor }}
                  >
                    {agent.name[0]}
                  </div>
                );
              })()}
              <div>
                <div className="font-medium text-gray-900">{agent.name}</div>
                <div className="text-xs text-gray-500">{agent.capabilities.join(", ")}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
