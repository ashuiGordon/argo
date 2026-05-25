import { useEffect, useState } from "react";
import { api } from "../../services/api-client";
import { getAgentLogo } from "../../lib/agent-logos";

interface Agent {
  id: string;
  name: string;
  type: string;
  avatarColor: string;
}

interface GroupChatCreatorProps {
  onClose: () => void;
  onCreate: (agentIds: string[]) => void;
}

export function GroupChatCreator({ onClose, onCreate }: GroupChatCreatorProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.agents.list().then((res) => setAgents(res.agents as Agent[]));
  }, []);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="w-full max-w-md rounded-[var(--radius-md)] border border-gray-200 bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Create Group Chat</h2>
        <p className="mb-3 text-xs text-gray-500">Select 2+ Agents for orchestrated collaboration:</p>
        <div className="space-y-2">
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => toggle(agent.id)}
              className={`flex w-full items-center gap-3 rounded-[var(--radius-sm)] border p-3 text-left cursor-pointer ${
                selected.has(agent.id) ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              {(() => {
                const logo = getAgentLogo(agent.type);
                return logo ? (
                  <img src={logo} alt={agent.name} className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: agent.avatarColor }}
                  >
                    {agent.name[0]}
                  </div>
                );
              })()}
              <span className="text-sm text-gray-900">{agent.name}</span>
              {selected.has(agent.id) && <span className="ml-auto text-blue-600">✓</span>}
            </button>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onCreate(Array.from(selected))}
            disabled={selected.size < 2}
            className="rounded-[var(--radius-sm)] bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 cursor-pointer"
          >
            Create Group ({selected.size} selected)
          </button>
          <button onClick={onClose} className="rounded-[var(--radius-sm)] border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
