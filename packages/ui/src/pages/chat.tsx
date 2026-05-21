import { useEffect, useState } from "react";
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
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeView, setActiveView] = useState<"chat" | "terminal">("chat");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const isGroupChat = activeConversation?.mode === "group";
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
      return () => wsClient.unsubscribe(activeConversationId);
    }
  }, [activeConversationId]);

  useEffect(() => {
    const currentEvts = activeConversationId ? events.get(activeConversationId) || [] : [];
    const sessionStart = [...currentEvts].reverse().find(
      (e) => e.payload.type === "session_start",
    );
    if (sessionStart && sessionStart.payload.type === "session_start") {
      setActiveSessionId(sessionStart.payload.sessionId);
    }
  }, [activeConversationId, events]);

  async function loadEvents(conversationId: string) {
    const res = await api.conversations.events(conversationId);
    for (const event of res.events as Array<{ sequence: number; type: string; payload: NormalizedEvent; timestamp: string }>) {
      addEvent(conversationId, event);
    }
  }

  async function handleSend(content: string) {
    if (!activeConversationId) return;
    setIsStreaming(true);
    try {
      await api.messages.send(activeConversationId, content);
    } finally {
      setTimeout(() => setIsStreaming(false), 5000);
    }
  }

  const currentEvents = activeConversationId
    ? events.get(activeConversationId) || []
    : [];

  return (
    <div className="flex h-screen bg-zinc-950">
      <aside className="w-72 shrink-0 border-r border-zinc-800 bg-zinc-900">
        <div className="flex h-full flex-col">
          <ConversationList />
          <div className="border-t border-zinc-800 p-3">
            <button
              onClick={logout}
              className="w-full rounded px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>
      <main className="flex flex-1 flex-col">
        {activeConversationId ? (
          <>
            <ViewTabs
              activeView={activeView}
              onViewChange={setActiveView}
              hasActiveSession={!!activeSessionId}
            />
            {activeView === "chat" ? (
              <>
                {isGroupChat && currentTasks.length > 0 && <TaskDag tasks={currentTasks} />}
                <MessageList events={currentEvents} isStreaming={isStreaming} />
                <MessageInput onSend={handleSend} />
              </>
            ) : activeSessionId ? (
              <TerminalView sessionId={activeSessionId} />
            ) : null}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-zinc-500">
            Select a conversation or create a new one
          </div>
        )}
      </main>
    </div>
  );
}
