import { useState } from "react";

export interface SkillEntry {
  name: string;
  description: string;
  prompt: string;
}

interface SkillFormProps {
  skills: SkillEntry[];
  onChange: (skills: SkillEntry[]) => void;
}

const emptySkill = (): SkillEntry => ({ name: "", description: "", prompt: "" });

export function SkillForm({ skills, onChange }: SkillFormProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  function add() {
    const next = [...skills, emptySkill()];
    onChange(next);
    setExpandedIdx(next.length - 1);
  }

  function remove(idx: number) {
    onChange(skills.filter((_, i) => i !== idx));
    if (expandedIdx === idx) setExpandedIdx(null);
  }

  function update(idx: number, patch: Partial<SkillEntry>) {
    onChange(skills.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-600">Skills / Slash Commands</label>
        <button
          type="button"
          onClick={add}
          className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer"
        >
          + Add Skill
        </button>
      </div>

      {skills.length === 0 && (
        <p className="text-xs text-gray-400 italic">No custom skills configured</p>
      )}

      {skills.map((skill, idx) => (
        <div key={idx} className="rounded-[var(--radius-sm)] border border-gray-200 bg-gray-50 p-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
              className="flex-1 text-left text-xs font-medium text-gray-700 cursor-pointer"
            >
              {skill.name ? `/${skill.name}` : "(unnamed)"} — {skill.description || "(no description)"}
            </button>
            <button
              type="button"
              onClick={() => remove(idx)}
              className="ml-2 text-xs text-red-500 hover:text-red-700 cursor-pointer"
            >
              Remove
            </button>
          </div>

          {expandedIdx === idx && (
            <div className="mt-2 space-y-2">
              <input
                type="text"
                value={skill.name}
                onChange={(e) => update(idx, { name: e.target.value })}
                placeholder="skill-name (lowercase, hyphens)"
                className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
              <input
                type="text"
                value={skill.description}
                onChange={(e) => update(idx, { description: e.target.value })}
                placeholder="Short description of what this skill does"
                className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
              <textarea
                value={skill.prompt}
                onChange={(e) => update(idx, { prompt: e.target.value })}
                placeholder="Skill prompt/instructions..."
                rows={4}
                className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none resize-y"
              />
              <p className="text-[10px] text-gray-400">
                {skill.prompt.length}/10000 characters
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
