import { useEffect, useState } from "react";
import { api } from "../../services/api-client";
import { getAgentLogo } from "../../lib/agent-logos";
import { FolderPicker } from "../shared/folder-picker";

interface Agent {
  id: string;
  name: string;
  type: string;
  avatarColor: string;
  capabilities: string[];
}

interface AgentPickerProps {
  onSelect: (agentId: string, workspace: string) => void;
  onClose: () => void;
}

export function AgentPicker({ onSelect, onClose }: AgentPickerProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState("");

  useEffect(() => {
    api.agents.list().then((res) => setAgents(res.agents as Agent[]));
  }, []);

  function handleConfirm() {
    if (!selectedAgent || !workspace.trim()) return;
    onSelect(selectedAgent, workspace.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="w-full max-w-md rounded-[var(--radius-md)] border border-gray-200 bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">New Conversation</h2>

        <div className="mb-4">
          <label className="mb-1.5 block text-[12px] font-medium text-gray-600">
            Working Directory <span className="text-red-500">*</span>
          </label>
          <FolderPicker value={workspace} onChange={setWorkspace} />
          <p className="mt-1 text-[11px] text-gray-400">
            The agent will work in this directory
          </p>
        </div>

        <label className="mb-1.5 block text-[12px] font-medium text-gray-600">
          Select Agent
        </label>
        <div className="max-h-[240px] space-y-2 overflow-y-auto">
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => setSelectedAgent(agent.id)}
              className={`flex w-full items-center gap-3 rounded-[var(--radius-sm)] border p-3 text-left cursor-pointer transition-colors ${
                selectedAgent === agent.id
                  ? "border-gray-900 bg-gray-50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
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

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-[var(--radius-sm)] px-4 py-2 text-[13px] text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedAgent || !workspace.trim()}
            className="rounded-[var(--radius-sm)] bg-gray-900 px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-30 cursor-pointer"
          >
            Start Chat
          </button>
        </div>
      </div>
    </div>
  );
}
