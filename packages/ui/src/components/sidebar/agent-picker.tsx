import { useEffect, useState } from "react";
import { api } from "../../services/api-client";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold text-white">Select Agent</h2>
        <div className="space-y-2">
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => onSelect(agent.id)}
              className="flex w-full items-center gap-3 rounded-lg border border-zinc-700 p-3 text-left hover:border-zinc-500 hover:bg-zinc-800"
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: agent.avatarColor }}
              >
                {agent.name[0]}
              </div>
              <div>
                <div className="font-medium text-white">{agent.name}</div>
                <div className="text-xs text-zinc-400">{agent.capabilities.join(", ")}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
