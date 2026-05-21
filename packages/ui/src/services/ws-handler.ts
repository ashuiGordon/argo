import type { ServerMessage, NormalizedEvent, TaskStatus } from "@argo/shared";
import { useConversationsStore } from "../stores/conversations";
import { useOrchestratorStore } from "../stores/orchestrator";
import { wsClient } from "./ws-client";

export function initWsHandler() {
  return wsClient.onMessage((msg: ServerMessage) => {
    if (msg.type === "event") {
      const store = useConversationsStore.getState();
      const activeId = store.activeConversationId;
      if (activeId) {
        const payload = msg.payload as NormalizedEvent;
        store.addEvent(activeId, {
          sequence: msg.sequence,
          type: payload.type,
          payload,
          timestamp: new Date().toISOString(),
        });

        if (payload.type === "task_status") {
          const orchStore = useOrchestratorStore.getState();
          orchStore.updateTask(
            activeId,
            payload.taskId,
            payload.status as TaskStatus,
            (payload as { error?: string }).error,
          );
        }
      }
    }
  });
}
