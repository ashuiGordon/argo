import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useConversationsStore } from "../stores/conversations";
import { useOrchestratorStore } from "../stores/orchestrator";
import { useFileVersionsStore } from "../stores/file-versions";
import { useWorkspacePanelStore } from "../stores/workspace-panel";
import { ConversationList } from "../components/sidebar/conversation-list";
import { MessageList } from "../components/chat/message-list";
import { MessageInput } from "../components/chat/message-input";
import { FullscreenEditor } from "../components/editor/fullscreen-editor";
import { FullscreenFilePreview } from "../components/preview/fullscreen-file-preview";
import { WorkspacePanel } from "../components/workspace/workspace-panel";
import { TaskDag } from "../components/orchestrator/task-dag";
import { NewChatComposer } from "../components/chat/new-chat-composer";
import { AgentsToolsPanel } from "../components/agents-tools/agents-tools-panel";
import { TeamProgressBar } from "../components/chat/team-progress-bar";
import { api } from "../services/api-client";
import { wsClient } from "../services/ws-client";
import { initWsHandler } from "../services/ws-handler";
import { useAuthStore } from "../stores/auth";
import type { NormalizedEvent } from "@argo/shared";

export function ChatPage() {
  const { activeConversationId, events, conversations } = useConversationsStore();
  const { addEvent, clearUnread } = useConversationsStore();
  const orchestratorTasks = useOrchestratorStore((s) => s.tasks);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [showPanel, setShowPanel] = useState<"agents-tools" | null>(null);

  const panelOpen = useWorkspacePanelStore((s) => s.isOpen);
  const openPanel = useWorkspacePanelStore((s) => s.open);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const isGroupChat = activeConversation?.mode === "group";
  const workspace = activeConversation?.workspace;
  const currentTasks = activeConversationId ? orchestratorTasks.get(activeConversationId) || [] : [];
  const teamPhase = activeConversationId ? useConversationsStore.getState().teamPhases.get(activeConversationId) : undefined;

  useEffect(() => {
    wsClient.connect();
    const cleanup = initWsHandler();
    return () => {
      cleanup();
      wsClient.disconnect();
    };
  }, []);

  useEffect(() => {
    setShowPanel(null);
    if (activeConversationId) {
      wsClient.subscribe(activeConversationId);
      loadEvents(activeConversationId);
      api.conversations.markRead(activeConversationId);
      clearUnread(activeConversationId);
      return () => wsClient.unsubscribe(activeConversationId);
    }
  }, [activeConversationId]);

  async function loadEvents(conversationId: string) {
    const res = await api.conversations.events(conversationId);
    const orchStore = useOrchestratorStore.getState();
    const convStore = useConversationsStore.getState();
    const allEvents: Array<{ sequence: number; type: string; payload: NormalizedEvent; timestamp: string }> = [];
    for (const event of res.events as Array<{ sequence: number; type: string; payload: NormalizedEvent; timestamp: string }>) {
      addEvent(conversationId, event);
      allEvents.push(event);
      if (event.payload.type === "task_status") {
        const p = event.payload as { taskId: string; status: string; title?: string; assignee?: string; error?: string };
        orchStore.updateTask(conversationId, p.taskId, p.status as never, p.error, p.title, p.assignee);
      }
      if (event.payload.type === "team_phase_change") {
        const p = event.payload as { phase: string; previousPhase?: string; presetId?: string };
        convStore.updateTeamPhase(conversationId, {
          phase: p.phase,
          previousPhase: p.previousPhase,
          presetId: p.presetId,
        });
      }
    }
    useFileVersionsStore.getState().buildVersions(conversationId, allEvents);
  }

  async function handleSend(content: string) {
    if (!activeConversationId) return;
    await api.messages.send(activeConversationId, content);
  }

  const currentEvents = activeConversationId
    ? events.get(activeConversationId) || []
    : [];

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar — collapses to icon-only when panel is open */}
      <aside
        className={`shrink-0 border-r border-gray-200 bg-[#f8f9fa] flex flex-col overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
          panelOpen ? "w-[60px]" : "w-[260px]"
        }`}
      >
        <ConversationList
          collapsed={panelOpen}
          onShowAgentsTools={() => setShowPanel("agents-tools")}
          onNewChat={() => setShowPanel(null)}
        />
        <div className="border-t border-gray-200 px-2 py-3">
          <button
            onClick={() => navigate("/settings")}
            className={`flex w-full items-center rounded-[var(--radius-sm)] py-2 text-[13px] text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 cursor-pointer ${
              panelOpen ? "justify-center px-0" : "gap-2.5 px-3"
            }`}
            title="设置"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {!panelOpen && <span>设置</span>}
          </button>
        </div>
      </aside>

      {/* Main chat area */}
      <main className="flex flex-1 flex-col bg-white min-w-0">
        {showPanel === "agents-tools" ? (
          <AgentsToolsPanel onClose={() => setShowPanel(null)} />
        ) : activeConversationId ? (
          <>
            {/* Chat header */}
            {workspace && (
              <div className="flex items-center justify-between border-b border-gray-100 px-3 py-1.5">
                <button
                  onClick={() => navigator.clipboard.writeText(workspace)}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] text-gray-500 hover:text-gray-700 hover:bg-gray-50 cursor-pointer min-w-0"
                  title={`Click to copy: ${workspace}`}
                >
                  <svg className="h-3.5 w-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>
                  <span className="truncate font-mono">{workspace.replace(/^\/Users\/[^/]+/, "~")}</span>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openPanel("deploy")}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg cursor-pointer transition-colors text-gray-400 hover:text-gray-600 hover:bg-gray-100`}
                    title="部署"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /></svg>
                  </button>
                  <button
                    onClick={() => openPanel("files")}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg cursor-pointer transition-colors text-gray-400 hover:text-gray-600 hover:bg-gray-100`}
                    title="文件"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" /></svg>
                  </button>
                  <button
                    onClick={() => openPanel("preview")}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg cursor-pointer transition-colors text-gray-400 hover:text-gray-600 hover:bg-gray-100`}
                    title="预览"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </button>
                </div>
              </div>
            )}
            {isGroupChat && currentTasks.length > 0 && <TaskDag tasks={currentTasks} />}
            {isGroupChat && teamPhase && (
              <TeamProgressBar
                phase={teamPhase.phase}
                previousPhase={teamPhase.previousPhase}
                presetId={teamPhase.presetId}
              />
            )}
            <MessageList events={currentEvents} isStreaming={false} conversationId={activeConversationId} />
            <MessageInput onSend={handleSend} workspace={workspace || undefined} conversationId={activeConversationId} />
          </>
        ) : (
          <NewChatComposer />
        )}
      </main>

      {/* Right Panel — workspace panel */}
      <div
        className={`shrink-0 border-l border-gray-200 bg-white overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.2,0,0,1)] h-full ${
          panelOpen ? "w-[60%]" : "w-0 border-l-0"
        }`}
      >
        {panelOpen && <WorkspacePanel workspace={workspace || undefined} conversationId={activeConversationId || undefined} />}
      </div>

      {/* Fullscreen overlays */}
      <FullscreenEditor onSendMessage={handleSend} />
      <FullscreenFilePreview />
    </div>
  );
}
