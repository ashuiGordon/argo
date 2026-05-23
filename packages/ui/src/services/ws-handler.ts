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
          const taskPayload = payload as { taskId: string; status: TaskStatus; error?: string; title?: string; assignee?: string };
          orchStore.updateTask(
            activeId,
            taskPayload.taskId,
            taskPayload.status as TaskStatus,
            taskPayload.error,
            taskPayload.title,
            taskPayload.assignee,
          );
        }
      }
    }
  });
}
