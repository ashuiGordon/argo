import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../../services/api-client";
import { useConversationsStore } from "../../stores/conversations";
import { getAgentLogo } from "../../lib/agent-logos";

interface AgentOption {
  id: string;
  name: string;
  type: string;
  avatarColor: string;
}

export function NewChatComposer() {
  const [message, setMessage] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState<"chat" | "argo">("chat");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const setActiveConversation = useConversationsStore((s) => s.setActiveConversation);
  const loadConversations = useConversationsStore((s) => s.setConversations);

  useEffect(() => {
    api.agents.list().then((res) => {
      const list = res.agents as AgentOption[];
      setAgents(list);
      if (list.length === 1) setSelectedAgentIds([list[0].id]);
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

    const agentIdsToUse = mode === "argo"
      ? agents.map((a) => a.id)
      : selectedAgentIds;

    if (agentIdsToUse.length === 0) return;

    setSending(true);
    try {
      let convMode: "single" | "group" | "argo";
      if (mode === "argo") {
        convMode = "argo";
      } else {
        convMode = agentIdsToUse.length === 1 ? "single" : "group";
      }
      const res = await api.conversations.create(convMode, agentIdsToUse, undefined, workspace);

      // Reload conversations list
      const convRes = await api.conversations.list(1, 50);
      loadConversations(convRes.conversations as never);

      setActiveConversation(res.id);
      await api.messages.send(res.id, trimmed, workspace);
    } catch {
      // handle error silently — conversation view will show state
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
  const canSend = message.trim() && (mode === "argo" ? agents.length > 0 : selectedAgentIds.length > 0) && workspace && !sending;
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
              onClick={() => setMode("chat")}
              className={`rounded-[var(--radius-sm)] px-4 py-1.5 text-[13px] font-medium transition-all cursor-pointer ${
                mode === "chat"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setMode("argo")}
              className={`rounded-[var(--radius-sm)] px-4 py-1.5 text-[13px] font-medium transition-all cursor-pointer ${
                mode === "argo"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Argo
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
              {mode === "argo" ? (
                <span className="flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-blue-200 bg-blue-50 px-2.5 py-1 text-[12px] text-blue-600 font-medium">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                  All agents ({agents.length})
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
                    const logo = getAgentLogo(agent.type);
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
                    {unselectedAgents.length === 0 && selectedAgents.length > 0 && (
                      <p className="px-3 py-2 text-[12px] text-gray-400">All agents selected</p>
                    )}
                    {agents.length === 0 && (
                      <p className="px-3 py-2 text-[12px] text-gray-400">No agents configured</p>
                    )}
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
                          const logo = getAgentLogo(agent.type);
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
                    {selectedAgents.length > 0 && unselectedAgents.length > 0 && (
                      <div className="my-1 border-t border-gray-100" />
                    )}
                    {selectedAgents.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => toggleAgent(agent.id)}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-gray-500 hover:bg-gray-50 cursor-pointer"
                      >
                        {(() => {
                          const logo = getAgentLogo(agent.type);
                          return logo ? (
                            <img src={logo} alt="" className="h-5 w-5 rounded-full opacity-50" />
                          ) : (
                            <div
                              className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white opacity-50"
                              style={{ backgroundColor: agent.avatarColor }}
                            >
                              {agent.name[0]}
                            </div>
                          );
                        })()}
                        <span className="line-through">{agent.name}</span>
                        <svg className="ml-auto h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
