import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../../services/api-client";
import { useConversationsStore } from "../../stores/conversations";
import { getAgentLogo, getAgentAvatar, getAgentDisplayAvatar } from "../../lib/agent-logos";
import { AgentAvatar } from "../shared/agent-avatar";

interface AgentOption {
  id: string;
  name: string;
  type: string;
  avatarColor: string;
  avatarUrl?: string;
  role?: string;
}

export function NewChatComposer() {
  const [message, setMessage] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState<"chat" | "team">("chat");
  const [teamMode, setTeamMode] = useState<"auto" | "custom">("auto");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const setActiveConversation = useConversationsStore((s) => s.setActiveConversation);
  const loadConversations = useConversationsStore((s) => s.setConversations);

  useEffect(() => {
    api.agents.list().then((res) => {
      const list = res.agents as AgentOption[];
      setAgents(list);
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowAgentDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePickWorkspace = useCallback(async () => {
    try {
      const res = await api.system.pickFolder();
      if (res.path) setWorkspace(res.path);
    } catch {
      // native picker unavailable
    }
  }, []);

  function selectSingleAgent(id: string) {
    setSelectedAgentIds([id]);
    setShowAgentDropdown(false);
  }

  function toggleAgent(id: string) {
    setSelectedAgentIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  }

  function removeAgent(id: string) {
    setSelectedAgentIds((prev) => prev.filter((a) => a !== id));
  }

  async function handleSubmit() {
    const trimmed = message.trim();
    if (!trimmed || !workspace || sending) return;

    let agentIdsToUse: string[];
    let teamPresetId: string | undefined;

    if (mode === "team") {
      if (teamMode === "auto") {
        agentIdsToUse = agents.map((a) => a.id);
        teamPresetId = "auto";
      } else {
        agentIdsToUse = selectedAgentIds;
      }
    } else {
      agentIdsToUse = selectedAgentIds;
    }

    if (agentIdsToUse.length === 0) return;

    setSending(true);
    try {
      const convMode: "single" | "group" = mode === "chat" ? "single" : "group";
      const res = await api.conversations.create(convMode, agentIdsToUse, undefined, workspace, teamPresetId);

      const convRes = await api.conversations.list(1, 50);
      loadConversations(convRes.conversations as never);

      setActiveConversation(res.id);
      await api.messages.send(res.id, trimmed, workspace);
    } catch {
      // handle error silently
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    }
  }

  const selectedAgents = agents.filter((a) => selectedAgentIds.includes(a.id));
  const unselectedAgents = agents.filter((a) => !selectedAgentIds.includes(a.id));

  const canSend = (() => {
    if (!message.trim() || !workspace || sending) return false;
    if (mode === "team") {
      return teamMode === "auto" ? agents.length > 0 : selectedAgentIds.length > 1;
    }
    return selectedAgentIds.length === 1;
  })();

  const workspaceName = workspace ? workspace.split("/").pop() : "";

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-2xl">
        <h1 className="mb-2 text-center font-display text-[32px] font-400 tracking-tight text-gray-900">
          Argo
        </h1>
        <p className="mb-8 text-center text-[14px] text-gray-400 italic">
          Set sail — let your agents navigate the unknown
        </p>

        {/* Mode switcher */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex rounded-[var(--radius-md)] border border-gray-200 bg-gray-50 p-0.5">
            <button
              onClick={() => { setMode("chat"); setSelectedAgentIds([]); }}
              className={`rounded-[var(--radius-sm)] px-4 py-1.5 text-[13px] font-medium transition-all cursor-pointer ${
                mode === "chat"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => { setMode("team"); setSelectedAgentIds([]); }}
              className={`rounded-[var(--radius-sm)] px-4 py-1.5 text-[13px] font-medium transition-all cursor-pointer ${
                mode === "team"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Team
            </button>
          </div>
        </div>

        {/* Composer box */}
        <div className="rounded-[var(--radius-lg)] border border-gray-200 bg-white shadow-sm transition-colors focus-within:border-gray-300 focus-within:shadow-md">
          {/* Textarea */}
          <div className="px-4 pt-4 pb-2">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              placeholder="Do anything"
              rows={2}
              className="w-full resize-none bg-transparent text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none"
            />
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              {mode === "team" ? (
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Auto / Custom toggle */}
                  <div className="inline-flex rounded-[var(--radius-pill)] border border-gray-200 bg-gray-50 p-0.5">
                    <button
                      onClick={() => { setTeamMode("auto"); setSelectedAgentIds([]); }}
                      className={`rounded-[var(--radius-pill)] px-2.5 py-0.5 text-[11px] font-medium transition-all cursor-pointer ${
                        teamMode === "auto"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Auto
                    </button>
                    <button
                      onClick={() => { setTeamMode("custom"); setSelectedAgentIds([]); }}
                      className={`rounded-[var(--radius-pill)] px-2.5 py-0.5 text-[11px] font-medium transition-all cursor-pointer ${
                        teamMode === "custom"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Custom
                    </button>
                  </div>

                  {teamMode === "auto" ? (
                    <span className="text-[12px] text-gray-400">
                      All {agents.length} agents — Moderator decides
                    </span>
                  ) : (
                    <>
                      {/* Selected agent chips */}
                      {selectedAgents.map((agent) => (
                        <button
                          key={agent.id}
                          onClick={() => removeAgent(agent.id)}
                          className="flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-gray-200 bg-gray-50 pl-1 pr-2.5 py-1 text-[12px] text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                          title={`Remove ${agent.name}`}
                        >
                          {(() => {
                            const logo = getAgentAvatar(agent.role) || getAgentLogo(agent.type);
                            return logo ? (
                              <img src={logo} alt="" className="h-4 w-4 rounded-full" />
                            ) : (
                              <div
                                className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                                style={{ backgroundColor: agent.avatarColor }}
                              >
                                {agent.name[0]}
                              </div>
                            );
                          })()}
                          <span className="font-medium">{agent.name}</span>
                          <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      ))}

                      {/* Add agent button + dropdown */}
                      <div className="relative" ref={dropdownRef}>
                        <button
                          onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                          className="flex items-center gap-1 rounded-[var(--radius-pill)] border border-dashed border-gray-300 px-2.5 py-1 text-[12px] text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                          {selectedAgentIds.length === 0 ? "Select agents" : "Add"}
                        </button>

                        {showAgentDropdown && (
                          <div className="absolute bottom-full left-0 mb-2 w-56 rounded-[var(--radius-md)] border border-gray-200 bg-white py-1 shadow-lg z-50">
                            {unselectedAgents.map((agent) => (
                              <button
                                key={agent.id}
                                onClick={() => {
                                  toggleAgent(agent.id);
                                  if (unselectedAgents.length <= 1) setShowAgentDropdown(false);
                                }}
                                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-gray-700 hover:bg-gray-50 cursor-pointer"
                              >
                                {(() => {
                                  const logo = getAgentAvatar(agent.role) || getAgentLogo(agent.type);
                                  return logo ? (
                                    <img src={logo} alt="" className="h-5 w-5 rounded-full" />
                                  ) : (
                                    <div
                                      className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                                      style={{ backgroundColor: agent.avatarColor }}
                                    >
                                      {agent.name[0]}
                                    </div>
                                  );
                                })()}
                                {agent.name}
                              </button>
                            ))}
                            {unselectedAgents.length === 0 && (
                              <p className="px-3 py-2 text-[12px] text-gray-400">All agents selected</p>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {/* Chat mode: single agent selector */}
                  {selectedAgents.length === 1 && (
                    <button
                      onClick={() => { setSelectedAgentIds([]); setShowAgentDropdown(true); }}
                      className="flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-gray-200 bg-gray-50 pl-1 pr-2.5 py-1 text-[12px] text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      {(() => {
                        const agent = selectedAgents[0];
                        const logo = getAgentAvatar(agent.role) || getAgentLogo(agent.type);
                        return logo ? (
                          <img src={logo} alt="" className="h-4 w-4 rounded-full" />
                        ) : (
                          <div
                            className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                            style={{ backgroundColor: agent.avatarColor }}
                          >
                            {agent.name[0]}
                          </div>
                        );
                      })()}
                      <span className="font-medium">{selectedAgents[0].name}</span>
                      <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
                      </svg>
                    </button>
                  )}

                  {selectedAgents.length === 0 && (
                    <div className="relative" ref={dropdownRef}>
                      <button
                        onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                        className="flex items-center gap-1 rounded-[var(--radius-pill)] border border-dashed border-gray-300 px-2.5 py-1 text-[12px] text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Select agent
                      </button>

                      {showAgentDropdown && (
                        <div className="absolute bottom-full left-0 mb-2 w-56 rounded-[var(--radius-md)] border border-gray-200 bg-white py-1 shadow-lg z-50">
                          {agents.length === 0 && (
                            <p className="px-3 py-2 text-[12px] text-gray-400">No agents configured</p>
                          )}
                          {agents.map((agent) => (
                            <button
                              key={agent.id}
                              onClick={() => selectSingleAgent(agent.id)}
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-gray-700 hover:bg-gray-50 cursor-pointer"
                            >
                              {(() => {
                                const logo = getAgentAvatar(agent.role) || getAgentLogo(agent.type);
                                return logo ? (
                                  <img src={logo} alt="" className="h-5 w-5 rounded-full" />
                                ) : (
                                  <div
                                    className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                                    style={{ backgroundColor: agent.avatarColor }}
                                  >
                                    {agent.name[0]}
                                  </div>
                                );
                              })()}
                              {agent.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Send button */}
            <button
              onClick={handleSubmit}
              disabled={!canSend}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-white transition-opacity hover:opacity-90 disabled:opacity-20 cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Workspace picker below composer */}
        <div className="mt-3 flex items-center">
          <button
            onClick={handlePickWorkspace}
            className="flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-[13px] text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
            {workspace ? (
              <span>
                <span className="text-gray-700 font-medium">{workspaceName}</span>
                <span className="ml-1 text-gray-400">▾</span>
              </span>
            ) : (
              <span>Work in a project <span className="text-gray-400">▾</span></span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
