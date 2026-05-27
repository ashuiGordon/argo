import { create } from "zustand";
import type { ConversationWithDetails, NormalizedEvent, ArgoState } from "@argo/shared";

interface ConversationsState {
  conversations: ConversationWithDetails[];
  activeConversationId: string | null;
  events: Map<string, Array<{ sequence: number; type: string; payload: NormalizedEvent; timestamp: string }>>;
  argoStates: Map<string, ArgoState>;
  setConversations: (conversations: ConversationWithDetails[]) => void;
  setActiveConversation: (id: string | null) => void;
  clearUnread: (conversationId: string) => void;
  addEvent: (conversationId: string, event: { sequence: number; type: string; payload: NormalizedEvent; timestamp: string }) => void;
  updateStreamingMessage: (conversationId: string, sessionId: string, content: string, final: boolean) => void;
  updateArgoState: (conversationId: string, state: ArgoState) => void;
}

export const useConversationsStore = create<ConversationsState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  events: new Map(),
  argoStates: new Map(),

  setConversations: (conversations) => set({ conversations }),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  clearUnread: (conversationId) => {
    const conversations = get().conversations.map((c) =>
      c.id === conversationId ? { ...c, unreadCount: 0 } : c,
    );
    set({ conversations });
  },

  addEvent: (conversationId, event) => {
    const events = get().events;
    const convEvents = events.get(conversationId) || [];
    const existing = convEvents.find((e) => e.sequence === event.sequence);
    if (!existing) {
      convEvents.push(event);
      convEvents.sort((a, b) => a.sequence - b.sequence);
      const newMap = new Map(events);
      newMap.set(conversationId, convEvents);
      set({ events: newMap });
    }
  },

  updateStreamingMessage: (conversationId, sessionId, content, final) => {
    const events = get().events;
    const convEvents = events.get(conversationId) || [];
    const lastMsg = [...convEvents].reverse().find(
      (e) => e.payload.type === "message" && e.payload.sessionId === sessionId && (e.payload as { role: string }).role === "assistant",
    );
    if (lastMsg && !final) {
      (lastMsg.payload as { content: string }).content = content;
      const newMap = new Map(events);
      newMap.set(conversationId, [...convEvents]);
      set({ events: newMap });
    }
  },

  updateArgoState: (conversationId, state) => {
    const argoStates = new Map(get().argoStates);
    argoStates.set(conversationId, state);
    set({ argoStates });
  },
}));
