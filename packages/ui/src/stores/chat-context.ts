import { create } from "zustand";

interface ChatContextState {
  pendingContext: { filePath: string; selectedCode: string } | null;
  setContext: (ctx: { filePath: string; selectedCode: string }) => void;
  clearContext: () => void;
}

export const useChatContextStore = create<ChatContextState>((set) => ({
  pendingContext: null,
  setContext: (ctx) => set({ pendingContext: ctx }),
  clearContext: () => set({ pendingContext: null }),
}));
