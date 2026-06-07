import { create } from "zustand";

export type PanelTab = "preview" | "files" | "git" | "deploy";

interface WorkspacePanelState {
  isOpen: boolean;
  activeTab: PanelTab;
  previewUrl: string | null;
  previewHtml: string | null;
  previewTitle: string;
}

interface WorkspacePanelStore extends WorkspacePanelState {
  open: (tab?: PanelTab) => void;
  close: () => void;
  setTab: (tab: PanelTab) => void;
  setPreviewUrl: (url: string, title?: string) => void;
  setPreviewHtml: (html: string, title?: string) => void;
}

export const useWorkspacePanelStore = create<WorkspacePanelStore>((set) => ({
  isOpen: false,
  activeTab: "preview",
  previewUrl: null,
  previewHtml: null,
  previewTitle: "Preview",

  open: (tab) => set((s) => ({ isOpen: true, activeTab: tab || s.activeTab })),
  close: () => set({ isOpen: false }),
  setTab: (tab) => set({ activeTab: tab }),

  setPreviewUrl: (url, title) =>
    set({ isOpen: true, activeTab: "preview", previewUrl: url, previewHtml: null, previewTitle: title || url }),

  setPreviewHtml: (html, title) =>
    set({ isOpen: true, activeTab: "preview", previewUrl: null, previewHtml: html, previewTitle: title || "Preview" }),
}));
