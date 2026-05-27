import type { ServerMessage, NormalizedEvent, TaskStatus } from "@argo/shared";
import { useConversationsStore } from "../stores/conversations";
import { useOrchestratorStore } from "../stores/orchestrator";
import { useSessionsStore } from "../stores/sessions";
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

        if (payload.type === "team_phase_change") {
          const phasePayload = payload as { phase: string; previousPhase?: string; presetId?: string };
          store.updateTeamPhase(activeId, {
            phase: phasePayload.phase,
            previousPhase: phasePayload.previousPhase,
            presetId: phasePayload.presetId,
          });
        }

        handleSessionEvents(payload);
      }
    }
  });
}

function handleSessionEvents(event: NormalizedEvent) {
  const sessStore = useSessionsStore.getState();

  switch (event.type) {
    case "session_start": {
      const e = event as { sessionId: string; provider: "claude_code" | "codex"; workspace: string };
      sessStore.updateSession(e.sessionId, {
        sessionId: e.sessionId,
        provider: e.provider,
        status: "running",
        hookEvents: [],
      });
      break;
    }
    case "session_end": {
      const e = event as { sessionId: string; exitCode: number };
      sessStore.updateSession(e.sessionId, {
        status: e.exitCode === 0 ? "stopped" : "crashed",
      });
      break;
    }
    case "token_usage": {
      const e = event as {
        sessionId: string; provider: string; model?: string;
        inputTokens: number; outputTokens: number; totalTokens: number;
        cachedInputTokens: number; contextUsedTokens?: number;
        contextWindowTokens?: number; contextPercent?: number;
      };
      sessStore.setTokenUsage(e.sessionId, {
        model: e.model,
        inputTokens: e.inputTokens,
        outputTokens: e.outputTokens,
        totalTokens: e.totalTokens,
        cachedInputTokens: e.cachedInputTokens,
        contextUsedTokens: e.contextUsedTokens,
        contextWindowTokens: e.contextWindowTokens,
        contextPercent: e.contextPercent,
      });
      break;
    }
    case "hook_event": {
      const e = event as { sessionId: string; hookType: string; hookPayload: Record<string, unknown> };
      sessStore.addHookActivity(e.sessionId, {
        id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
        hookType: e.hookType,
        timestamp: new Date().toISOString(),
        summary: formatHookSummary(e.hookType, e.hookPayload),
      });
      break;
    }
  }
}

function formatHookSummary(hookType: string, payload: Record<string, unknown>): string {
  switch (hookType) {
    case "PreToolUse":
    case "PostToolUse":
      return `${hookType}: ${payload.tool_name || "unknown tool"}`;
    case "SubagentStart":
    case "SubagentStop":
      return `${hookType}: ${payload.agent_name || "subagent"}`;
    case "Notification":
      return `${payload.title || "Notification"}`;
    default:
      return hookType;
  }
}
