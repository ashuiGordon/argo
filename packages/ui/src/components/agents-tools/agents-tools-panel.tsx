import { useState } from "react";
import { MyAgentsTab } from "./my-agents-tab";
import { McpMarketplaceTab } from "./mcp-marketplace-tab";
import { SkillsTab } from "./skills-tab";

interface AgentsToolsPanelProps {
  onClose: () => void;
}

type TabId = "agents" | "mcp" | "skills";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "agents", label: "我的智能体" },
  { id: "mcp", label: "MCP 市场" },
  { id: "skills", label: "技能" },
];

export function AgentsToolsPanel({ onClose }: AgentsToolsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("agents");

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h1 className="font-display text-[20px] font-500 tracking-[-0.2px] text-gray-900">
          智能体 & 工具
        </h1>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200 px-6">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-2.5 text-[13px] font-500 transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? "text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gray-900 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "agents" && <MyAgentsTab />}
        {activeTab === "mcp" && <McpMarketplaceTab />}
        {activeTab === "skills" && <SkillsTab />}
      </div>
    </div>
  );
}
