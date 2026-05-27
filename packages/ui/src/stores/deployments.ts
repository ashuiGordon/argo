import { create } from "zustand";

interface DeploymentInfo {
  id: string;
  conversationId: string;
  type: string;
  status: string;
  target: string;
  url?: string;
  error?: string;
  createdAt: string;
}

interface DeploymentsState {
  deployments: Map<string, DeploymentInfo[]>;
  addDeployment: (conversationId: string, deployment: DeploymentInfo) => void;
  updateDeployment: (conversationId: string, id: string, updates: Partial<DeploymentInfo>) => void;
  getDeployments: (conversationId: string) => DeploymentInfo[];
}

export const useDeploymentsStore = create<DeploymentsState>((set, get) => ({
  deployments: new Map(),
  addDeployment: (conversationId, deployment) =>
    set((state) => {
      const map = new Map(state.deployments);
      const list = [...(map.get(conversationId) || []), deployment];
      map.set(conversationId, list);
      return { deployments: map };
    }),
  updateDeployment: (conversationId, id, updates) =>
    set((state) => {
      const map = new Map(state.deployments);
      const list = (map.get(conversationId) || []).map((d) =>
        d.id === id ? { ...d, ...updates } : d,
      );
      map.set(conversationId, list);
      return { deployments: map };
    }),
  getDeployments: (conversationId) => get().deployments.get(conversationId) || [],
}));
