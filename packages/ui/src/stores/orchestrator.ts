import { create } from "zustand";
import type { TaskStatus } from "@argo/shared";

interface OrchestratorTask {
  id: string;
  title: string;
  assignee: string;
  status: TaskStatus;
  dependsOn: string[];
  error?: string;
}

interface OrchestratorState {
  tasks: Map<string, OrchestratorTask[]>;
  updateTask: (conversationId: string, taskId: string, status: TaskStatus, error?: string) => void;
  setTasks: (conversationId: string, tasks: OrchestratorTask[]) => void;
}

export const useOrchestratorStore = create<OrchestratorState>((set, get) => ({
  tasks: new Map(),

  setTasks: (conversationId, tasks) => {
    const map = new Map(get().tasks);
    map.set(conversationId, tasks);
    set({ tasks: map });
  },

  updateTask: (conversationId, taskId, status, error) => {
    const map = new Map(get().tasks);
    const tasks = [...(map.get(conversationId) || [])];
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx >= 0) {
      tasks[idx] = { ...tasks[idx], status, error };
      map.set(conversationId, tasks);
      set({ tasks: map });
    }
  },
}));
