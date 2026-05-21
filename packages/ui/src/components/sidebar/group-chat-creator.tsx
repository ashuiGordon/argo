import { useEffect, useState } from "react";
import { api } from "../../services/api-client";

interface Agent {
  id: string;
  name: string;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold text-white">Create Group Chat</h2>
        <p className="mb-3 text-xs text-zinc-400">Select 2+ Agents for orchestrated collaboration:</p>
        <div className="space-y-2">
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => toggle(agent.id)}
              className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left ${
                selected.has(agent.id) ? "border-blue-500 bg-blue-950/30" : "border-zinc-700 hover:bg-zinc-800"
              }`}
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: agent.avatarColor }}
              >
                {agent.name[0]}
              </div>
              <span className="text-sm text-white">{agent.name}</span>
              {selected.has(agent.id) && <span className="ml-auto text-blue-400">✓</span>}
            </button>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onCreate(Array.from(selected))}
            disabled={selected.size < 2}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Create Group ({selected.size} selected)
          </button>
          <button onClick={onClose} className="rounded bg-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-600">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
