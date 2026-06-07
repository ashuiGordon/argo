import { useEffect, useRef, useMemo, useState } from "react";
import type { NormalizedEvent } from "@argo/shared";
import { MessageBubble } from "./message-bubble";
import { ArtifactCard } from "./artifact-card";
import { ArtifactsSummaryCard } from "./artifacts-summary-card";
import { StreamingIndicator } from "./streaming-message";
import { BrainCircuit, ChevronRight } from "lucide-react";
import { AgentAvatar } from "../shared/agent-avatar";
import { useConversationsStore } from "../../stores/conversations";
import { ApprovalCard } from "../approval/approval-card";
import { DeployCard } from "./deploy-card";

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

function ThinkingCard({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="pl-4 my-1 animate-fade-in">
      <div className="border-l-2 border-gray-200 pl-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] hover:bg-gray-50 transition-colors cursor-pointer w-full text-left"
        >
          <BrainCircuit className="h-3.5 w-3.5 shrink-0 text-purple-400" />
          <span className="font-medium text-gray-500">思考过程</span>
          <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-gray-300 transition-transform duration-200 ml-auto ${expanded ? "rotate-90" : ""}`} />
        </button>
        {expanded && (
          <div className="mt-1 px-2 py-2 rounded-md bg-gray-50 text-[13px] text-gray-500 leading-[1.7] whitespace-pre-wrap max-h-60 overflow-y-auto">
            {content}
          </div>
        )}
      </div>
    </div>
  );
}

export function MessageList({ events, isStreaming, conversationId }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const conversations = useConversationsStore((s) => s.conversations);
  const activeConversation = conversations.find((c) => c.id === conversationId);
  const agents = activeConversation?.agents || [];
  const primaryAgent = agents[0] as { name: string; type: string; avatarColor: string; avatarUrl?: string; role?: string } | undefined;

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

  const ARTIFACT_EXTS = new Set(["html", "htm", "pdf", "png", "jpg", "jpeg", "gif", "webp", "svg", "docx", "doc", "pptx", "ppt", "xlsx", "xls"]);

  const turnSummaries = useMemo(() => {
    const summaries = new Map<number, Array<{ filePath: string; fileName: string; ext: string; content?: string }>>();
    let turnFiles: Array<{ filePath: string; fileName: string; ext: string; content?: string }> = [];

    for (let i = 0; i < events.length; i++) {
      const payload = events[i].payload;

      if (payload.type === "tool_use" && (payload.tool === "Write" || payload.tool === "Edit")) {
        const filePath = (payload.input.file_path as string) || "";
        const fileName = filePath.split("/").pop() || filePath;
        const ext = fileName.split(".").pop()?.toLowerCase() || "";
        if (ARTIFACT_EXTS.has(ext)) {
          const content = (payload.input.content as string) || undefined;
          turnFiles.push({ filePath, fileName, ext, content });
        }
      }

      const nextPayload = i + 1 < events.length ? events[i + 1].payload : null;
      const isEndOfTurn = !nextPayload || (nextPayload.type === "message" && nextPayload.role === "user");

      if (isEndOfTurn && turnFiles.length > 0) {
        summaries.set(i, [...turnFiles]);
        turnFiles = [];
      }

      if (payload.type === "message" && payload.role === "user") {
        turnFiles = [];
      }
    }
    return summaries;
  }, [events]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="mx-auto max-w-4xl">
        {(() => {
          let headerShownForTurn = false;
          return events.flatMap((event, idx) => {
          const isUserMessage = event.payload.type === "message" && event.payload.role === "user";
          const turnFiles = turnSummaries.get(idx);

          // Reset header tracking on user message
          if (isUserMessage) {
            headerShownForTurn = false;
          }

          // Show agent header once per turn
          let showHeader = false;
          if (!isUserMessage && !headerShownForTurn) {
            // Check there's a user message before this (or it's the start)
            let hasUserBefore = idx === 0;
            for (let j = idx - 1; j >= 0; j--) {
              const p = events[j].payload;
              if (p.type === "message" && p.role === "user") { hasUserBefore = true; break; }
              if (p.type === "message" && p.role === "assistant") break;
              if (p.type === "tool_use" || p.type === "thinking" || p.type === "artifacts_detected") break;
            }
            if (hasUserBefore) {
              showHeader = true;
              headerShownForTurn = true;
            }
          }

          const nodes: React.ReactNode[] = [];

          // Agent header at the start of each turn
          if (showHeader && primaryAgent) {
            nodes.push(
              <div key={`header-${idx}`} className="flex items-center gap-2 pl-4 pb-1 pt-3">
                <AgentAvatar agent={primaryAgent} size={20} />
                <span className="text-[12px] font-medium text-gray-500">{primaryAgent.name}</span>
              </div>
            );
          }

          switch (event.payload.type) {
            case "message":
              if (isUserMessage) {
                nodes.length = 0; // clear header if we pushed one for a user message (shouldn't happen)
                nodes.push(<MessageBubble key={event.sequence} event={event.payload} showAvatar={true} />);
              } else {
                nodes.push(
                  <div key={event.sequence} className="pl-4 animate-fade-in">
                    <MessageBubble event={event.payload} showAvatar={false} />
                  </div>
                );
              }
              break;
            case "tool_use":
              nodes.push(
                <div key={event.sequence} className="pl-4 animate-fade-in">
                  <ArtifactCard toolUse={event.payload} toolResult={toolResultMap.get(event.sequence)} conversationId={conversationId} />
                </div>
              );
              break;
            case "tool_result":
              if (!consumedResults.has(event.sequence)) {
                nodes.push(
                  <div key={event.sequence} className="pl-4 mb-1 animate-fade-in">
                    <div className="border-l-2 border-gray-200 pl-3 rounded-md py-1.5 text-[12px] text-gray-400 font-mono truncate">
                      {event.payload.output.slice(0, 150)}{event.payload.output.length > 150 && "…"}
                    </div>
                  </div>
                );
              }
              break;
            case "thinking":
              nodes.push(<ThinkingCard key={event.sequence} content={(event.payload as { content: string }).content} />);
              break;
            case "approval_request":
              nodes.push(
                <div key={event.sequence} className="pl-4">
                  <ApprovalCard approvalId={event.payload.approvalId} toolName={event.payload.toolName} riskLevel={event.payload.riskLevel} action={event.payload.action} proposedAction={event.payload.proposedAction} />
                </div>
              );
              break;
            case "approval_resolved":
              nodes.push(
                <div key={event.sequence} className="pl-4 py-1 animate-fade-in">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${event.payload.decision === "approve" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    {event.payload.decision === "approve" ? "✓ Approved" : "✗ Denied"}
                  </span>
                </div>
              );
              break;
            case "error":
              nodes.push(
                <div key={event.sequence} className="pl-4 py-1 animate-fade-in">
                  <div className="rounded-md bg-red-50 px-3 py-2 text-[12px] text-red-700">{event.payload.message}</div>
                </div>
              );
              break;
            case "artifacts_detected": {
              const detected = event.payload as { files: Array<{ filePath: string; fileName: string; ext: string }> };
              if (detected.files.length > 0) {
                nodes.push(<ArtifactsSummaryCard key={`detected-${event.sequence}`} files={detected.files} />);
              }
              break;
            }
            case "deploy_status":
              nodes.push(
                <div key={event.sequence} className="pl-4">
                  <DeployCard deployment={event.payload as unknown as { deploymentId: string; deployType: "preview" | "static" | "container" | "package"; status: string; target: string; url?: string; error?: string; logs?: string[] }} />
                </div>
              );
              break;
          }

          if (turnFiles) {
            nodes.push(<ArtifactsSummaryCard key={`artifacts-${idx}`} files={turnFiles} />);
          }

          return nodes;
        });
        })()}
        {isStreaming && <StreamingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
