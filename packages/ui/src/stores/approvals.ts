import { create } from "zustand";
import { api } from "../services/api-client";

interface ApprovalEntry {
  approvalId: string;
  sessionId: string;
  conversationId: string;
  toolName: string;
  riskLevel: string;
  proposedAction: Record<string, unknown>;
  action: string;
  createdAt: string;
}

interface ApprovalsState {
  pending: ApprovalEntry[];
  addPending: (approval: ApprovalEntry) => void;
  removePending: (approvalId: string) => void;
  loadPending: () => Promise<void>;
}

export const useApprovalsStore = create<ApprovalsState>((set) => ({
  pending: [],

  addPending: (approval) =>
    set((state) => ({
      pending: [...state.pending, approval],
    })),

  removePending: (approvalId) =>
    set((state) => ({
      pending: state.pending.filter((a) => a.approvalId !== approvalId),
    })),

  loadPending: async () => {
    const res = await api.approvals.pending();
    set({ pending: res.approvals as ApprovalEntry[] });
  },
}));
