import { useEffect, useRef } from "react";
import type { NormalizedEvent } from "@argo/shared";
import { MessageBubble } from "./message-bubble";
import { ToolUseCard } from "./tool-use-card";
import { StreamingIndicator } from "./streaming-message";
import { ApprovalCard } from "../approval/approval-card";

interface MessageListProps {
  events: Array<{ sequence: number; type: string; payload: NormalizedEvent; timestamp: string }>;
  isStreaming: boolean;
}

export function MessageList({ events, isStreaming }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length, isStreaming]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="mx-auto max-w-3xl">
        {events.map((event) => {
          switch (event.payload.type) {
            case "message":
              return <MessageBubble key={event.sequence} event={event.payload} />;
            case "tool_use":
              return <ToolUseCard key={event.sequence} event={event.payload} />;
            case "tool_result":
              return (
                <div key={event.sequence} className="mb-3 ml-6 animate-fade-in rounded-[var(--radius-sm)] border border-gray-200 bg-gray-50 px-3 py-2 text-[12px] text-gray-600">
                  <span className="font-mono text-gray-500">{event.payload.tool}</span>
                  <span className="mx-1.5 text-gray-300">→</span>
                  {event.payload.output.slice(0, 200)}
                  {event.payload.output.length > 200 && "…"}
                </div>
              );
            case "approval_request":
              return (
                <ApprovalCard
                  key={event.sequence}
                  approvalId={event.payload.approvalId}
                  toolName={event.payload.toolName}
                  riskLevel={event.payload.riskLevel}
                  action={event.payload.action}
                  proposedAction={event.payload.proposedAction}
                />
              );
            case "approval_resolved":
              return (
                <div key={event.sequence} className="mb-4 flex justify-center animate-fade-in">
                  <span className={`rounded-[var(--radius-pill)] px-3 py-1 text-[11px] font-mono uppercase tracking-[0.2px] ${
                    event.payload.decision === "approve"
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}>
                    {event.payload.decision === "approve" ? "Approved" : "Denied"} — {event.payload.decidedBy}
                  </span>
                </div>
              );
            case "error":
              return (
                <div key={event.sequence} className="mb-3 animate-fade-in rounded-[var(--radius-sm)] border border-red-200 bg-red-50 px-4 py-2.5 text-[12px] text-red-700">
                  {event.payload.message}
                </div>
              );
            default:
              return null;
          }
        })}
        {isStreaming && <StreamingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
