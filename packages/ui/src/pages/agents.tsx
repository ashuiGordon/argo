import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();

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
    <div className="flex h-screen bg-[#17171c]">
      <div className="mx-auto w-full max-w-2xl px-8 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate("/")}
              className="text-[13px] text-[#93939f] underline transition-colors hover:text-white cursor-pointer"
            >
              ← Back
            </button>
            <h1 className="font-display text-[24px] font-400 tracking-[-0.32px] text-white">
              Agents
            </h1>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="rounded-[var(--radius-pill)] bg-white px-4 py-2 text-[13px] font-500 text-[#17171c] transition-opacity hover:opacity-90 cursor-pointer"
          >
            Create Agent
          </button>
        </div>

        {(showForm || editingAgent) && (
          <div className="mb-8 rounded-[var(--radius-md)] border border-white/[0.1] bg-white/[0.03] p-6 animate-slide-up">
            <h2 className="mb-4 font-display text-[18px] font-500 tracking-[-0.2px] text-white">
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

        <div className="space-y-0 rounded-[var(--radius-md)] border border-white/[0.08] overflow-hidden">
          {agents.map((agent, i) => (
            <div
              key={agent.id}
              className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03] ${
                i < agents.length - 1 ? "border-b border-white/[0.06]" : ""
              }`}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-600 text-white"
                style={{ backgroundColor: agent.avatarColor }}
              >
                {agent.name[0]}
              </div>
              <div className="flex-1">
                <div className="text-[14px] font-500 text-white">{agent.name}</div>
                <div className="text-[11px] font-mono uppercase tracking-[0.2px] text-[#75758a]">{agent.type}</div>
              </div>
              {agent.type === "custom" && (
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditingAgent(agent)}
                    className="text-[12px] text-[#93939f] underline transition-colors hover:text-white cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(agent.id)}
                    className="text-[12px] text-[#93939f] underline transition-colors hover:text-red-400 cursor-pointer"
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
