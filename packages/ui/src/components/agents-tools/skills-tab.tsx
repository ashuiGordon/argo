import { useState, useEffect } from "react";
import { curatedSkills, type CuratedSkill } from "../../data/curated-skills";
import { api } from "../../services/api-client";
import { getAgentLogo, getAgentAvatar } from "../../lib/agent-logos";

interface AgentOption {
  id: string;
  name: string;
  type: string;
  avatarColor: string;
  role?: string;
  config?: {
    skills?: Array<{ name: string; description: string; prompt: string }>;
  };
}

const SKILL_CATEGORIES = ["all", "development", "review", "documentation", "testing", "devops", "data"] as const;

export function SkillsTab() {
  const [category, setCategory] = useState<string>("all");
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [installTarget, setInstallTarget] = useState<CuratedSkill | null>(null);

  useEffect(() => {
    api.agents.list().then((res) => setAgents(res.agents as AgentOption[]));
  }, []);

  const filtered = category === "all"
    ? curatedSkills
    : curatedSkills.filter((s) => s.category === category);

  function isInstalled(skillName: string) {
    return agents.some((a) => a.config?.skills?.some((s) => s.name === skillName));
  }

  function getInstalledAgents(skillName: string) {
    return agents.filter((a) => a.config?.skills?.some((s) => s.name === skillName));
  }

  async function handleInstall(agentId: string) {
    if (!installTarget) return;

    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;

    const existing = agent.config?.skills || [];
    if (existing.some((s) => s.name === installTarget.name)) return;

    const updated = [...existing, {
      name: installTarget.name,
      description: installTarget.description,
      prompt: installTarget.prompt,
    }];

    await api.agents.update(agentId, { config: { skills: updated } } as never);
    const res = await api.agents.list();
    setAgents(res.agents as AgentOption[]);
    setInstallTarget(null);
  }

  return (
    <div className="p-6">
      <p className="mb-4 text-[13px] text-gray-500">
        Add pre-built skills to your agents. Skills are slash-commands that provide specialized capabilities.
      </p>

      {/* Category chips */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {SKILL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`rounded-[var(--radius-pill)] px-3 py-1 text-[11px] font-500 transition-colors cursor-pointer ${
              category === cat
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {cat === "all" ? "全部" : cat}
          </button>
        ))}
      </div>

      {/* Skills grid */}
      <div className="grid gap-2">
        {filtered.map((skill) => {
          const installed = isInstalled(skill.name);
          const installedOn = getInstalledAgents(skill.name);

          return (
            <div
              key={skill.id}
              className="flex items-start gap-4 rounded-[var(--radius-md)] border border-gray-200 px-4 py-3 transition-colors hover:bg-gray-50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-br from-purple-50 to-indigo-50 text-purple-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-500 text-gray-900">/{skill.name}</span>
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">{skill.category}</span>
                </div>
                <p className="mt-0.5 text-[12px] text-gray-500">{skill.description}</p>
                {installed && installedOn.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-1">
                    <span className="text-[10px] text-gray-400">on:</span>
                    {installedOn.map((a) => (
                      <span key={a.id} className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-500 text-green-600">
                        {a.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setInstallTarget(skill)}
                className="shrink-0 rounded-[var(--radius-pill)] border border-gray-200 px-3 py-1 text-[11px] font-500 text-gray-700 transition-colors hover:bg-gray-100 cursor-pointer"
              >
                {installed ? "添加到..." : "安装"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Install modal */}
      {installTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setInstallTarget(null)}>
          <div
            className="w-full max-w-md rounded-[var(--radius-lg)] border border-gray-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-1 text-[15px] font-500 text-gray-900">
              Install "/{installTarget.name}"
            </h3>
            <p className="mb-4 text-[12px] text-gray-500">
              Choose which agent to add this skill to
            </p>

            <div className="space-y-1.5">
              {agents.map((agent) => {
                const alreadyHas = agent.config?.skills?.some((s) => s.name === installTarget.name);
                return (
                  <button
                    key={agent.id}
                    onClick={() => !alreadyHas && handleInstall(agent.id)}
                    disabled={alreadyHas}
                    className={`flex w-full items-center gap-3 rounded-[var(--radius-sm)] border border-gray-200 px-3 py-2.5 text-left transition-colors cursor-pointer ${
                      alreadyHas ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
                    }`}
                  >
                    {(() => {
                      const logo = getAgentAvatar(agent.role) || getAgentLogo(agent.type);
                      return logo ? (
                        <img src={logo} alt="" className="h-6 w-6 rounded-full" />
                      ) : (
                        <div
                          className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                          style={{ backgroundColor: agent.avatarColor }}
                        >
                          {agent.name[0]}
                        </div>
                      );
                    })()}
                    <span className="text-[13px] font-500 text-gray-900">{agent.name}</span>
                    {alreadyHas && (
                      <span className="ml-auto text-[11px] text-green-500">Already installed</span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setInstallTarget(null)}
              className="mt-4 w-full rounded-[var(--radius-sm)] border border-gray-200 py-2 text-[12px] text-gray-600 transition-colors hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
