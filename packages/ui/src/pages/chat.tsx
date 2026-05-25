import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useConversationsStore } from "../stores/conversations";
import { useOrchestratorStore } from "../stores/orchestrator";
import { ConversationList } from "../components/sidebar/conversation-list";
import { MessageList } from "../components/chat/message-list";
import { MessageInput } from "../components/chat/message-input";
import { ViewTabs } from "../components/chat/view-tabs";
import { TerminalView } from "../components/terminal/terminal-view";
import { TaskDag } from "../components/orchestrator/task-dag";
import { api } from "../services/api-client";
import { wsClient } from "../services/ws-client";
import { initWsHandler } from "../services/ws-handler";
import { useAuthStore } from "../stores/auth";
import type { NormalizedEvent } from "@argo/shared";

export function ChatPage() {
  const { activeConversationId, events, conversations } = useConversationsStore();
  const { addEvent } = useConversationsStore();
  const orchestratorTasks = useOrchestratorStore((s) => s.tasks);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeView, setActiveView] = useState<"chat" | "terminal">("chat");
  const [ptySessionId, setPtySessionId] = useState<string | null>(null);
  const ptyConvRef = useRef<string | null>(null);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const isGroupChat = activeConversation?.mode === "group";
  const isExternal = activeConversation?.isExternal;
  const currentTasks = activeConversationId ? orchestratorTasks.get(activeConversationId) || [] : [];

  useEffect(() => {
    wsClient.connect();
    const cleanup = initWsHandler();
    return () => {
      cleanup();
      wsClient.disconnect();
    };
  }, []);

  useEffect(() => {
    if (activeConversationId) {
      wsClient.subscribe(activeConversationId);
      loadEvents(activeConversationId);
      setActiveView("chat");
      setPtySessionId(null);
      ptyConvRef.current = null;
      return () => wsClient.unsubscribe(activeConversationId);
    }
  }, [activeConversationId]);

  useEffect(() => {
    const currentEvts = activeConversationId ? events.get(activeConversationId) || [] : [];
    const lastEvent = currentEvts[currentEvts.length - 1];
    if (lastEvent?.payload.type === "session_end") {
      setIsStreaming(false);
    }
  }, [activeConversationId, events]);

  useEffect(() => {
    if (activeView === "terminal" && activeConversationId && !ptySessionId) {
      if (ptyConvRef.current !== activeConversationId) {
        api.sessions.createPty(activeConversationId).then((res) => {
          setPtySessionId(res.sessionId);
          ptyConvRef.current = activeConversationId;
        });
      }
    }
  }, [activeView, activeConversationId, ptySessionId]);

  async function loadEvents(conversationId: string) {
    const res = await api.conversations.events(conversationId);
    const orchStore = useOrchestratorStore.getState();
    for (const event of res.events as Array<{ sequence: number; type: string; payload: NormalizedEvent; timestamp: string }>) {
      addEvent(conversationId, event);
      if (event.payload.type === "task_status") {
        const p = event.payload as { taskId: string; status: string; title?: string; assignee?: string; error?: string };
        orchStore.updateTask(conversationId, p.taskId, p.status as never, p.error, p.title, p.assignee);
      }
    }
  }

  async function handleSend(content: string) {
    if (!activeConversationId) return;
    setIsStreaming(true);
    await api.messages.send(activeConversationId, content);
  }

  const currentEvents = activeConversationId
    ? events.get(activeConversationId) || []
    : [];

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <aside className="w-[280px] shrink-0 border-r border-gray-200 bg-[#f8f9fa] flex flex-col">
        <ConversationList />
        <div className="border-t border-gray-200 px-4 py-3 space-y-1">
          <button
            onClick={() => navigate("/agents")}
            className="w-full rounded-[var(--radius-sm)] px-3 py-2 text-left text-[13px] text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
          >
            Manage Agents
          </button>
          <button
            onClick={logout}
            className="w-full rounded-[var(--radius-sm)] px-3 py-2 text-left text-[13px] text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col bg-white">
        {activeConversationId ? (
          <>
            <ViewTabs
              activeView={activeView}
              onViewChange={setActiveView}
              hasActiveSession={true}
            />
            {activeView === "chat" ? (
              <>
                {isGroupChat && currentTasks.length > 0 && <TaskDag tasks={currentTasks} />}
                <MessageList events={currentEvents} isStreaming={isStreaming} />
                {isExternal ? (
                  <div className="border-t border-gray-200 px-4 py-3 text-center text-[13px] text-gray-500">
                    Observe-only — external session
                  </div>
                ) : (
                  <MessageInput onSend={handleSend} />
                )}
              </>
            ) : ptySessionId ? (
              <TerminalView sessionId={ptySessionId} />
            ) : (
              <div className="flex flex-1 items-center justify-center text-gray-400 text-sm">
                Starting terminal…
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-6">
            <h2 className="font-display text-[32px] font-400 tracking-tight text-gray-900 leading-[1.0]">
              Argo
            </h2>
            <p className="text-[14px] text-gray-500">
              Select a conversation or create a new one
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
