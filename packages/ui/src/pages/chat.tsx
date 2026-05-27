import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useConversationsStore } from "../stores/conversations";
import { useOrchestratorStore } from "../stores/orchestrator";
import { useFileVersionsStore } from "../stores/file-versions";
import { ConversationList } from "../components/sidebar/conversation-list";
import { MessageList } from "../components/chat/message-list";
import { MessageInput } from "../components/chat/message-input";
import { FileTreePanel } from "../components/chat/file-tree-panel";
import { FullscreenEditor } from "../components/editor/fullscreen-editor";
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
  const [showFileTree, setShowFileTree] = useState(false);
  const [showPanel, setShowPanel] = useState<"agents-tools" | null>(null);

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
      {/* Sidebar */}
      <aside className="w-[260px] shrink-0 border-r border-gray-200 bg-[#f8f9fa] flex flex-col">
        <ConversationList
          onShowAgentsTools={() => setShowPanel("agents-tools")}
          onNewChat={() => setShowPanel(null)}
        />
        <div className="border-t border-gray-200 px-3 py-3">
          <button
            onClick={() => navigate("/settings")}
            className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-left text-[13px] text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col bg-white">
        {showPanel === "agents-tools" ? (
          <AgentsToolsPanel onClose={() => setShowPanel(null)} />
        ) : activeConversationId ? (
          <>
            {/* Chat header with file tree toggle */}
            {workspace && (
              <div className="flex items-center justify-end border-b border-gray-100 px-3 py-1.5">
                <button
                  onClick={() => setShowFileTree(!showFileTree)}
                  className={`flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1 text-[11px] transition-colors cursor-pointer ${
                    showFileTree ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                  }`}
                  title="Toggle file explorer"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                  </svg>
                  Files
                </button>
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

      {/* File Tree Panel */}
      {showFileTree && workspace && (
        <FileTreePanel workspace={workspace} onClose={() => setShowFileTree(false)} />
      )}

      {/* Fullscreen Editor Overlay */}
      <FullscreenEditor onSendMessage={handleSend} />
    </div>
  );
}
