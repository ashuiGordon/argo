import { create } from "zustand";
import type { FileVersion } from "./file-versions";

export type { FileVersion };

interface EditorState {
  isOpen: boolean;
  splitMode: boolean;
  mode: "edit" | "diff" | "readonly";
  filePath: string;
  content: string;
  original?: string;
  language: string;
  versions?: FileVersion[];
}

interface EditorStore extends EditorState {
  openEditor: (opts: { filePath: string; content: string; language: string; mode?: "edit" | "readonly"; versions?: FileVersion[] }) => void;
  openDiff: (opts: { filePath: string; original: string; modified: string; language: string; versions?: FileVersion[] }) => void;
  close: () => void;
  setContent: (content: string) => void;
  setSplitMode: (splitMode: boolean) => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  isOpen: false,
  splitMode: true,
  mode: "readonly",
  filePath: "",
  content: "",
  original: undefined,
  language: "text",
  versions: undefined,

  openEditor: ({ filePath, content, language, mode = "edit", versions }) =>
    set({ isOpen: true, mode, filePath, content, language, original: undefined, versions }),

  openDiff: ({ filePath, original, modified, language, versions }) =>
    set({ isOpen: true, mode: "diff", filePath, content: modified, original, language, versions }),

  close: () => set({ isOpen: false }),

  setContent: (content) => set({ content }),

  setSplitMode: (splitMode) => set({ splitMode }),
}));
