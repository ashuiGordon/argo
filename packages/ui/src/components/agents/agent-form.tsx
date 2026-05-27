import { useState } from "react";
import { McpServerPicker, type McpServerEntry } from "./mcp-server-picker";
import { SkillPicker, type SkillEntry } from "./skill-picker";
import { getAgentLogo } from "../../lib/agent-logos";

type AgentType = "claude_code" | "codex";

interface AgentFormData {
  name: string;
  type: AgentType;
  avatarColor: string;
  systemPrompt: string;
  capabilities: string[];
  config: {
    mcpServers?: McpServerEntry[];
    skills?: SkillEntry[];
  };
}

interface AgentFormProps {
  initial?: Partial<AgentFormData>;
  onSubmit: (data: AgentFormData) => void;
  onCancel: () => void;
  submitLabel?: string;
}

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

export function AgentForm({ initial, onSubmit, onCancel, submitLabel = "Create" }: AgentFormProps) {
  const [type, setType] = useState<AgentType>(initial?.type || "claude_code");
  const [name, setName] = useState(initial?.name || "");
  const [avatarColor, setAvatarColor] = useState(initial?.avatarColor || COLORS[0]);
  const [systemPrompt, setSystemPrompt] = useState(initial?.systemPrompt || "");
  const [mcpServers, setMcpServers] = useState<McpServerEntry[]>(initial?.config?.mcpServers || []);
  const [skills, setSkills] = useState<SkillEntry[]>(initial?.config?.skills || []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      type,
      avatarColor,
      systemPrompt,
      capabilities: [],
      config: {
        ...(mcpServers.length > 0 ? { mcpServers } : {}),
        ...(skills.length > 0 ? { skills } : {}),
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Type selector */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-600">Base Runtime</label>
        <div className="flex gap-2">
          {(["claude_code", "codex"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex items-center gap-2.5 rounded-[var(--radius-md)] border px-4 py-2.5 transition-all cursor-pointer ${
                type === t
                  ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <img
                src={getAgentLogo(t) || ""}
                alt=""
                className="h-5 w-5 rounded"
              />
              <span className={`text-[13px] font-500 ${type === t ? "text-blue-700" : "text-gray-700"}`}>
                {t === "claude_code" ? "Claude Code" : "Codex"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Custom Agent"
          className="w-full rounded-[var(--radius-sm)] border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Avatar Color */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Avatar Color</label>
        <div className="flex gap-2">
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setAvatarColor(color)}
              className={`h-7 w-7 rounded-full cursor-pointer ${avatarColor === color ? "ring-2 ring-gray-900 ring-offset-2" : ""}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* System Prompt */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">System Prompt</label>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="You are a helpful assistant that..."
          rows={3}
          className="w-full rounded-[var(--radius-sm)] border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* MCP Servers */}
      <McpServerPicker servers={mcpServers} onChange={setMcpServers} />

      {/* Skills */}
      <SkillPicker skills={skills} onChange={setSkills} />

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={!name.trim()}
          className="rounded-[var(--radius-sm)] bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 cursor-pointer"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[var(--radius-sm)] border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
