import { useState } from "react";
import type { NormalizedEvent } from "@argo/shared";
import { ApprovalCard } from "../approval/approval-card";

interface EventOverlayProps {
  events: Array<{ sequence: number; type: string; payload: NormalizedEvent; timestamp: string }>;
}

export function EventOverlay({ events }: EventOverlayProps) {
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const relevantEvents = events.filter((e) => {
    if (dismissed.has(e.sequence)) return false;
    return (
      e.payload.type === "approval_request" ||
      e.payload.type === "error" ||
      e.payload.type === "token_usage"
    );
  });

  if (relevantEvents.length === 0) return null;

  return (
    <div className="absolute right-4 top-4 z-20 flex flex-col gap-2 max-w-[320px] pointer-events-auto">
      {relevantEvents.map((event) => {
        switch (event.payload.type) {
          case "approval_request":
            return (
              <div key={event.sequence} className="animate-fade-in rounded-[var(--radius-md)] border border-amber-200 bg-white shadow-lg">
                <ApprovalCard
                  approvalId={event.payload.approvalId}
                  toolName={event.payload.toolName}
                  riskLevel={event.payload.riskLevel}
                  action={event.payload.action}
                  proposedAction={event.payload.proposedAction}
                />
              </div>
            );
          case "error":
            if (!event.payload.recoverable) {
              return (
                <div
                  key={event.sequence}
                  className="animate-fade-in rounded-[var(--radius-md)] border border-red-200 bg-white px-3 py-2 shadow-lg"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12px] text-red-700">{event.payload.message}</p>
                    <button
                      onClick={() => setDismissed((s) => new Set(s).add(event.sequence))}
                      className="shrink-0 text-gray-400 hover:text-gray-600 text-[10px]"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            }
            return null;
          case "token_usage": {
            const p = event.payload as {
              contextPercent?: number;
              model?: string;
              totalTokens: number;
            };
            if (!p.contextPercent || p.contextPercent < 50) return null;
            return (
              <div
                key={event.sequence}
                className="animate-fade-in rounded-[var(--radius-md)] border border-blue-200 bg-white px-3 py-2 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-600">
                    Context: {Math.round(p.contextPercent)}%
                  </span>
                  <span className="text-[10px] text-gray-400">{p.model}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      p.contextPercent > 80 ? "bg-red-400" : "bg-blue-400"
                    }`}
                    style={{ width: `${Math.min(p.contextPercent, 100)}%` }}
                  />
                </div>
              </div>
            );
          }
          default:
            return null;
        }
      })}
    </div>
  );
}
