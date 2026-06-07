import { useEffect, useState } from "react";
import { AgentForm } from "../agents/agent-form";
import { AgentAvatar } from "../shared/agent-avatar";
import { api } from "../../services/api-client";

interface Agent {
  id: string;
  name: string;
  type: string;
  avatarColor: string;
  avatarUrl?: string;
  systemPrompt?: string;
  role?: string;
  model?: string;
  disallowedTools?: string[];
  capabilities: string[];
  config?: {
    mcpServers?: Array<{ name: string; command: string; args?: string[]; env?: Record<string, string> }>;
    skills?: Array<{ name: string; description: string; prompt: string }>;
  };
}

export function MyAgentsTab() {
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

  async function handleCreate(data: { name: string; type?: string; avatarColor: string; systemPrompt: string; role?: string; model?: string; disallowedTools?: string[]; capabilities: string[]; config?: Record<string, unknown> }) {
    await api.agents.create(data);
    setShowForm(false);
    loadAgents();
  }

  async function handleUpdate(data: { name: string; type?: string; avatarColor: string; systemPrompt: string; role?: string; model?: string; disallowedTools?: string[]; capabilities: string[]; config?: Record<string, unknown> }) {
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
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-[13px] text-gray-500">
          Configure agents and their tools
        </p>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-[var(--radius-pill)] bg-gray-900 px-3.5 py-1.5 text-[12px] font-500 text-white transition-opacity hover:opacity-90 cursor-pointer"
        >
          + Create Agent
        </button>
      </div>

      {(showForm || editingAgent) && (
        <div className="mb-6 rounded-[var(--radius-md)] border border-gray-200 bg-gray-50 p-5 animate-slide-up">
          <h2 className="mb-3 text-[15px] font-500 text-gray-900">
            {editingAgent ? `编辑 ${editingAgent.name}` : "新建智能体"}
          </h2>
          <AgentForm
            agentId={editingAgent?.id}
            initial={editingAgent ? {
              name: editingAgent.name,
              type: (editingAgent.type === "claude_code" || editingAgent.type === "codex") ? editingAgent.type : "claude_code",
              avatarColor: editingAgent.avatarColor,
              avatarUrl: editingAgent.avatarUrl,
              systemPrompt: editingAgent.systemPrompt || "",
              role: editingAgent.role,
              model: editingAgent.model,
              disallowedTools: editingAgent.disallowedTools,
              config: {
                mcpServers: editingAgent.config?.mcpServers?.map((s) => ({
                  name: s.name,
                  command: s.command,
                  args: s.args || [],
                  env: s.env || {},
                })),
                skills: editingAgent.config?.skills,
              },
            } : undefined}
            onSubmit={editingAgent ? handleUpdate : handleCreate}
            onCancel={() => { setShowForm(false); setEditingAgent(null); }}
            submitLabel={editingAgent ? "保存" : "创建"}
          />
        </div>
      )}

      <div className="space-y-0 rounded-[var(--radius-md)] border border-gray-200 overflow-hidden">
        {agents.map((agent, i) => (
          <div
            key={agent.id}
            className={`flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-gray-50 ${
              i < agents.length - 1 ? "border-b border-gray-100" : ""
            }`}
          >
            <AgentAvatar agent={agent} size={32} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-500 text-gray-900">{agent.name}</div>
              <div className="flex items-center gap-2 mt-0.5">
                {agent.role && (
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-500 text-gray-600 capitalize">
                    {agent.role}
                  </span>
                )}
                {agent.model && (
                  <span className="text-[10px] font-mono text-gray-400">
                    {agent.model}
                  </span>
                )}
                {agent.disallowedTools && agent.disallowedTools.length > 0 && (
                  <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-500 text-red-500">
                    {agent.disallowedTools.length} blocked
                  </span>
                )}
                {agent.config?.mcpServers && agent.config.mcpServers.length > 0 && (
                  <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-500 text-blue-600">
                    {agent.config.mcpServers.length} MCP
                  </span>
                )}
                {agent.config?.skills && agent.config.skills.length > 0 && (
                  <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-500 text-purple-600">
                    {agent.config.skills.length} skills
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingAgent(agent)}
                className="rounded-[var(--radius-sm)] px-2.5 py-1 text-[11px] text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
              >
                Edit
              </button>
              {agent.type === "custom" && (
                <button
                  onClick={() => handleDelete(agent.id)}
                  className="rounded-[var(--radius-sm)] px-2.5 py-1 text-[11px] text-gray-500 transition-colors hover:bg-gray-100 hover:text-red-600 cursor-pointer"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
        {agents.length === 0 && (
          <p className="px-4 py-8 text-center text-[13px] text-gray-400">
            No agents configured yet
          </p>
        )}
      </div>
    </div>
  );
}
