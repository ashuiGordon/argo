import { useEffect, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
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
  const parentRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);

  const virtualizer = useVirtualizer({
    count: events.length + (isStreaming ? 1 : 0),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 10,
  });

  const scrollToBottom = useCallback(() => {
    if (parentRef.current) {
      parentRef.current.scrollTop = parentRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    if (events.length > prevLengthRef.current) {
      scrollToBottom();
    }
    prevLengthRef.current = events.length;
  }, [events.length, isStreaming, scrollToBottom]);

  function renderItem(index: number) {
    if (index >= events.length) {
      return <StreamingIndicator />;
    }

    const event = events[index];
    switch (event.payload.type) {
      case "message":
        return <MessageBubble event={event.payload} />;
      case "tool_use":
        return <ToolUseCard event={event.payload} />;
      case "tool_result":
        return (
          <div className="mb-3 ml-4 rounded border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-xs text-zinc-300">
            <span className="font-medium text-zinc-400">{event.payload.tool}:</span>{" "}
            {event.payload.output.slice(0, 200)}
            {event.payload.output.length > 200 && "..."}
          </div>
        );
      case "approval_request":
        return (
          <ApprovalCard
            approvalId={event.payload.approvalId}
            toolName={event.payload.toolName}
            riskLevel={event.payload.riskLevel}
            action={event.payload.action}
            proposedAction={event.payload.proposedAction}
          />
        );
      case "approval_resolved":
        return (
          <div className="mb-3 flex justify-center">
            <span className={`rounded-full px-3 py-1 text-xs ${
              event.payload.decision === "approve"
                ? "bg-green-900/50 text-green-300"
                : "bg-red-900/50 text-red-300"
            }`}>
              {event.payload.decision === "approve" ? "✓ Approved" : "✗ Denied"} ({event.payload.decidedBy})
            </span>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div ref={parentRef} className="flex-1 overflow-y-auto px-4 py-4">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
