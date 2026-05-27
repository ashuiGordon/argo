import { useEffect, useRef, useMemo } from "react";
import type { NormalizedEvent } from "@argo/shared";
import { MessageBubble } from "./message-bubble";
import { ArtifactCard } from "./artifact-card";
import { StreamingIndicator } from "./streaming-message";
import { ApprovalCard } from "../approval/approval-card";

interface EventEntry {
  sequence: number;
  type: string;
  payload: NormalizedEvent;
  timestamp: string;
}

interface MessageListProps {
  events: EventEntry[];
  isStreaming: boolean;
  conversationId?: string;
}

function buildToolResultMap(events: EventEntry[]): Map<number, { output: string; success: boolean }> {
  const map = new Map<number, { output: string; success: boolean }>();
  for (let i = 0; i < events.length; i++) {
    if (events[i].payload.type === "tool_use") {
      for (let j = i + 1; j < events.length; j++) {
        if (events[j].payload.type === "tool_result") {
          const result = events[j].payload as NormalizedEvent & { type: "tool_result" };
          map.set(events[i].sequence, { output: result.output, success: result.success });
          break;
        }
        if (events[j].payload.type === "tool_use" || events[j].payload.type === "message") {
          break;
        }
      }
    }
  }
  return map;
}

export function MessageList({ events, isStreaming, conversationId }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length, isStreaming]);

  const toolResultMap = useMemo(() => buildToolResultMap(events), [events]);

  const consumedResults = useMemo(() => {
    const set = new Set<number>();
    for (let i = 0; i < events.length; i++) {
      if (events[i].payload.type === "tool_use") {
        for (let j = i + 1; j < events.length; j++) {
          if (events[j].payload.type === "tool_result") {
            set.add(events[j].sequence);
            break;
          }
          if (events[j].payload.type === "tool_use" || events[j].payload.type === "message") {
            break;
          }
        }
      }
    }
    return set;
  }, [events]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="mx-auto max-w-3xl">
        {events.map((event) => {
          switch (event.payload.type) {
            case "message":
              return <MessageBubble key={event.sequence} event={event.payload} />;
            case "tool_use":
              return (
                <ArtifactCard
                  key={event.sequence}
                  toolUse={event.payload}
                  toolResult={toolResultMap.get(event.sequence)}
                  conversationId={conversationId}
                />
              );
            case "tool_result":
              if (consumedResults.has(event.sequence)) return null;
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
            case "worktree_created":
              return (
                <div key={event.sequence} className="mb-3 flex items-center gap-2 animate-fade-in rounded-[var(--radius-sm)] border border-blue-100 bg-blue-50 px-4 py-2 text-[12px] text-blue-700">
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>
                    <span className="font-medium">{event.payload.agentName}</span> working on branch{" "}
                    <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-[11px]">{event.payload.branch}</code>
                  </span>
                </div>
              );
            case "worktree_merged":
              return (
                <div key={event.sequence} className={`mb-3 flex items-center gap-2 animate-fade-in rounded-[var(--radius-sm)] border px-4 py-2 text-[12px] ${
                  event.payload.success
                    ? "border-green-100 bg-green-50 text-green-700"
                    : "border-amber-100 bg-amber-50 text-amber-700"
                }`}>
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {event.payload.success ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    )}
                  </svg>
                  <span>
                    <span className="font-medium">{event.payload.agentName}</span>
                    {event.payload.success
                      ? ` merged branch ${event.payload.branch}`
                      : ` merge conflicts on ${event.payload.branch}: ${event.payload.conflicts?.join(", ")}`}
                  </span>
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
