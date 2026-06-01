import { create } from "zustand";

interface FilePreviewState {
  isOpen: boolean;
  filePath: string;
  open: (filePath: string) => void;
  close: () => void;
}

export const useFilePreviewStore = create<FilePreviewState>((set) => ({
  isOpen: false,
  filePath: "",
  open: (filePath) => set({ isOpen: true, filePath }),
  close: () => set({ isOpen: false, filePath: "" }),
}));
