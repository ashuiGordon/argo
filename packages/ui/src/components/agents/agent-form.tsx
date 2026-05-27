import { useState, useRef } from "react";
import { McpServerPicker, type McpServerEntry } from "./mcp-server-picker";
import { SkillPicker, type SkillEntry } from "./skill-picker";
import { AgentAvatar } from "../shared/agent-avatar";
import { BUILTIN_AVATARS } from "../../lib/agent-logos";
import { api } from "../../services/api-client";

type AgentType = "claude_code" | "codex";
type AgentRole = "architect" | "planner" | "executor" | "reviewer" | "debugger" | "tester" | "designer" | "ops" | "";
type AgentModel = "opus" | "sonnet" | "haiku";

interface AgentFormData {
  name: string;
  type: AgentType;
  avatarColor: string;
  avatarUrl?: string;
  systemPrompt: string;
  role?: string;
  model?: string;
  disallowedTools?: string[];
  capabilities: string[];
  config: {
    mcpServers?: McpServerEntry[];
    skills?: SkillEntry[];
  };
}

interface AgentFormProps {
  agentId?: string;
  initial?: Partial<AgentFormData>;
  onSubmit: (data: AgentFormData) => void;
  onCancel: () => void;
  submitLabel?: string;
}

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#6366f1"];

const ROLES: { value: AgentRole; label: string }[] = [
  { value: "", label: "None" },
  { value: "architect", label: "Architect" },
  { value: "planner", label: "Planner" },
  { value: "executor", label: "Executor" },
  { value: "reviewer", label: "Reviewer" },
  { value: "debugger", label: "Debugger" },
  { value: "tester", label: "Tester" },
  { value: "designer", label: "Designer" },
  { value: "ops", label: "Ops" },
];

const MODELS: { value: AgentModel; label: string }[] = [
  { value: "sonnet", label: "Sonnet" },
  { value: "opus", label: "Opus" },
  { value: "haiku", label: "Haiku" },
];

const COMMON_TOOLS = ["Write", "Edit", "Bash", "Read", "WebSearch", "WebFetch"];

export function AgentForm({ agentId, initial, onSubmit, onCancel, submitLabel = "Create" }: AgentFormProps) {
  const [type, setType] = useState<AgentType>(initial?.type || "claude_code");
  const [name, setName] = useState(initial?.name || "");
  const [avatarColor, setAvatarColor] = useState(initial?.avatarColor || COLORS[0]);
  const [avatarUrl, setAvatarUrl] = useState(initial?.avatarUrl || "");
  const [systemPrompt, setSystemPrompt] = useState(initial?.systemPrompt || "");
  const [role, setRole] = useState<AgentRole>((initial?.role as AgentRole) || "");
  const [model, setModel] = useState<AgentModel>((initial?.model as AgentModel) || "sonnet");
  const [disallowedTools, setDisallowedTools] = useState<string[]>(initial?.disallowedTools || []);
  const [mcpServers, setMcpServers] = useState<McpServerEntry[]>(initial?.config?.mcpServers || []);
  const [skills, setSkills] = useState<SkillEntry[]>(initial?.config?.skills || []);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !agentId) return;

    setUploading(true);
    try {
      const res = await api.agents.uploadAvatar(agentId, file);
      setAvatarUrl(res.avatarUrl);
    } catch {
      // upload failed
    } finally {
      setUploading(false);
    }
  }

  function selectBuiltinAvatar(url: string) {
    setAvatarUrl(url);
  }

  function toggleTool(tool: string) {
    setDisallowedTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      type,
      avatarColor,
      avatarUrl: avatarUrl || undefined,
      systemPrompt,
      role: role || undefined,
      model,
      disallowedTools: disallowedTools.length > 0 ? disallowedTools : undefined,
      capabilities: [],
      config: {
        ...(mcpServers.length > 0 ? { mcpServers } : {}),
        ...(skills.length > 0 ? { skills } : {}),
      },
    });
  }

  const previewAgent = { name: name || "A", type, avatarColor, avatarUrl, role };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Avatar section */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-600">Avatar</label>
        <div className="flex items-start gap-4">
          {/* Current preview */}
          <div className="flex flex-col items-center gap-2">
            <AgentAvatar agent={previewAgent} size={48} />
            {agentId && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="text-[11px] text-blue-600 hover:text-blue-800 cursor-pointer disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </>
            )}
          </div>

          {/* Built-in avatar picker */}
          <div className="flex flex-wrap gap-2">
            {BUILTIN_AVATARS.map(({ role: r, url }) => (
              <button
                key={r}
                type="button"
                onClick={() => selectBuiltinAvatar(url)}
                className={`h-9 w-9 rounded-full overflow-hidden cursor-pointer transition-all ${
                  avatarUrl === url ? "ring-2 ring-blue-500 ring-offset-2" : "opacity-70 hover:opacity-100"
                }`}
              >
                <img src={url} alt={r} className="h-full w-full object-cover" />
              </button>
            ))}
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl("")}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-gray-300 text-gray-400 hover:text-gray-600 cursor-pointer"
                title="Remove avatar"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

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
              <span className={`text-[13px] font-500 ${type === t ? "text-blue-700" : "text-gray-700"}`}>
                {t === "claude_code" ? "Claude Code" : "Codex"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Name + Role row */}
      <div className="grid grid-cols-2 gap-4">
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
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as AgentRole)}
            className="w-full rounded-[var(--radius-sm)] border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Model + Avatar Color row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as AgentModel)}
            className="w-full rounded-[var(--radius-sm)] border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Fallback Color</label>
          <div className="flex gap-1.5 pt-1">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setAvatarColor(color)}
                className={`h-6 w-6 rounded-full cursor-pointer ${avatarColor === color ? "ring-2 ring-gray-900 ring-offset-2" : ""}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Disallowed Tools */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-600">
          Blocked Tools <span className="font-normal text-gray-400">(agent cannot use these)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {COMMON_TOOLS.map((tool) => (
            <button
              key={tool}
              type="button"
              onClick={() => toggleTool(tool)}
              className={`rounded-[var(--radius-pill)] border px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer ${
                disallowedTools.includes(tool)
                  ? "border-red-300 bg-red-50 text-red-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              {disallowedTools.includes(tool) && (
                <span className="mr-1">✕</span>
              )}
              {tool}
            </button>
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
          rows={5}
          className="w-full rounded-[var(--radius-sm)] border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
