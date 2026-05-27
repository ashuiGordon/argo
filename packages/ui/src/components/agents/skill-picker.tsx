import { useState } from "react";
import { curatedSkills } from "../../data/curated-skills";

export interface SkillEntry {
  name: string;
  description: string;
  prompt: string;
}

interface SkillPickerProps {
  skills: SkillEntry[];
  onChange: (skills: SkillEntry[]) => void;
}

const CATEGORIES = ["all", "development", "review", "documentation", "testing", "devops", "data"] as const;

export function SkillPicker({ skills, onChange }: SkillPickerProps) {
  const [category, setCategory] = useState<string>("all");

  function add(skill: typeof curatedSkills[0]) {
    if (skills.some((s) => s.name === skill.name)) return;
    onChange([...skills, { name: skill.name, description: skill.description, prompt: skill.prompt }]);
  }

  function remove(idx: number) {
    onChange(skills.filter((_, i) => i !== idx));
  }

  const filtered = category === "all"
    ? curatedSkills
    : curatedSkills.filter((s) => s.category === category);

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-gray-600">Skills</label>

      {/* Added skills */}
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {skills.map((skill, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-500 text-gray-700"
            >
              /{skill.name}
              <button
                type="button"
                onClick={() => remove(idx)}
                className="ml-0.5 text-gray-400 hover:text-red-500 cursor-pointer"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Browser */}
      <div className="rounded-[var(--radius-md)] border border-gray-200 bg-gray-50 p-3">
        {/* Category chips */}
        <div className="mb-2.5 flex flex-wrap gap-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`rounded-[var(--radius-pill)] px-2 py-0.5 text-[10px] font-500 transition-colors cursor-pointer ${
                category === cat
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-100"
              }`}
            >
              {cat === "all" ? "All" : cat}
            </button>
          ))}
        </div>

        {/* Skill grid */}
        <div className="max-h-[180px] space-y-1 overflow-y-auto">
          {filtered.map((skill) => {
            const isAdded = skills.some((s) => s.name === skill.name);
            return (
              <div
                key={skill.id}
                className={`flex items-center gap-2.5 rounded-[var(--radius-sm)] border border-gray-200 bg-white px-2.5 py-2 ${isAdded ? "opacity-50" : ""}`}
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-purple-50 text-purple-500">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-500 text-gray-900">/{skill.name}</div>
                  <div className="text-[10px] text-gray-400 truncate">{skill.description}</div>
                </div>
                <button
                  type="button"
                  onClick={() => add(skill)}
                  disabled={isAdded}
                  className={`shrink-0 rounded-[var(--radius-pill)] px-2 py-0.5 text-[10px] font-500 cursor-pointer ${
                    isAdded
                      ? "bg-green-50 text-green-500"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {isAdded ? "Added" : "+ Add"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
