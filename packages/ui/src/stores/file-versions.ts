import { create } from "zustand";
import type { NormalizedEvent } from "@argo/shared";

export interface FileVersion {
  sequence: number;
  timestamp: string;
  type: "write" | "edit";
  content: string;
  oldContent?: string;
}

interface EventEntry {
  sequence: number;
  type: string;
  payload: NormalizedEvent;
  timestamp: string;
}

interface FileVersionsStore {
  versions: Map<string, FileVersion[]>;
  buildVersions: (conversationId: string, events: EventEntry[]) => void;
  getVersions: (conversationId: string, filePath: string) => FileVersion[];
}

export const useFileVersionsStore = create<FileVersionsStore>((set, get) => ({
  versions: new Map(),

  buildVersions: (conversationId, events) => {
    const fileMap = new Map<string, FileVersion[]>();

    for (const event of events) {
      if (event.payload.type !== "tool_use") continue;

      const payload = event.payload as { type: "tool_use"; tool: string; input: Record<string, unknown> };

      if (payload.tool === "Write") {
        const filePath = (payload.input.file_path as string) || "";
        if (!filePath) continue;
        const key = `${conversationId}:${filePath}`;
        const list = fileMap.get(key) || [];
        list.push({
          sequence: event.sequence,
          timestamp: event.timestamp,
          type: "write",
          content: (payload.input.content as string) || "",
        });
        fileMap.set(key, list);
      } else if (payload.tool === "Edit") {
        const filePath = (payload.input.file_path as string) || "";
        if (!filePath) continue;
        const key = `${conversationId}:${filePath}`;
        const list = fileMap.get(key) || [];
        list.push({
          sequence: event.sequence,
          timestamp: event.timestamp,
          type: "edit",
          content: (payload.input.new_string as string) || "",
          oldContent: (payload.input.old_string as string) || "",
        });
        fileMap.set(key, list);
      }
    }

    const newVersions = new Map(get().versions);
    for (const [key, value] of fileMap) {
      newVersions.set(key, value);
    }
    set({ versions: newVersions });
  },

  getVersions: (conversationId, filePath) => {
    return get().versions.get(`${conversationId}:${filePath}`) || [];
  },
}));
