import { useEffect, useState } from "react";
import { AgentForm } from "../components/agents/agent-form";
import { api } from "../services/api-client";

interface Agent {
  id: string;
  name: string;
  type: string;
  avatarColor: string;
  systemPrompt?: string;
  capabilities: string[];
}

export function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  useEffect(() => {
    loadAgents();
  }, []);

  async function loadAgents() {
    const res = await api.agents.list();
    setAgents(res.agents as Agent[]);
  }

  async function handleCreate(data: { name: string; avatarColor: string; systemPrompt: string; capabilities: string[] }) {
    await api.agents.create(data);
    setShowForm(false);
    loadAgents();
  }

  async function handleUpdate(data: { name: string; avatarColor: string; systemPrompt: string; capabilities: string[] }) {
    if (!editingAgent) return;
    await api.agents.update(editingAgent.id, data);
    setEditingAgent(null);
    loadAgents();
  }

  async function handleDelete(id: string) {
    await api.agents.delete(id);
    loadAgents();
  }

  return (
    <div className="flex h-screen bg-zinc-950">
      <div className="mx-auto w-full max-w-2xl p-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Agents</h1>
          <button
            onClick={() => setShowForm(true)}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Create Agent
          </button>
        </div>

        {(showForm || editingAgent) && (
          <div className="mb-6 rounded-lg border border-zinc-700 bg-zinc-900 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              {editingAgent ? "Edit Agent" : "New Agent"}
            </h2>
            <AgentForm
              initial={editingAgent ? { name: editingAgent.name, avatarColor: editingAgent.avatarColor, systemPrompt: editingAgent.systemPrompt || "" } : undefined}
              onSubmit={editingAgent ? handleUpdate : handleCreate}
              onCancel={() => { setShowForm(false); setEditingAgent(null); }}
              submitLabel={editingAgent ? "Save" : "Create"}
            />
          </div>
        )}

        <div className="space-y-3">
          {agents.map((agent) => (
            <div key={agent.id} className="flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-900 p-4">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: agent.avatarColor }}
              >
                {agent.name[0]}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">{agent.name}</div>
                <div className="text-xs text-zinc-500">{agent.type}</div>
              </div>
              {agent.type === "custom" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingAgent(agent)}
                    className="rounded px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(agent.id)}
                    className="rounded px-3 py-1 text-xs text-red-400 hover:bg-red-950 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
