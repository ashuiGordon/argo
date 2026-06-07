import { useState } from "react";
import type { NormalizedEvent } from "@argo/shared";
import { FilePlus, FileEdit, FileText, Terminal, Globe, Search, Wrench, ChevronRight } from "lucide-react";
import {
  EditArtifact,
  FileArtifact,
  ReadArtifact,
  BashArtifact,
  WebArtifact,
  GenericToolCard,
} from "./artifacts";
import { getFileName } from "./artifacts/utils";

interface ArtifactCardProps {
  toolUse: NormalizedEvent & { type: "tool_use" };
  toolResult?: { output: string; success: boolean };
  conversationId?: string;
}

function getToolSummary(tool: string, input: Record<string, unknown>, result?: { output: string; success: boolean }): { Icon: React.ComponentType<{ className?: string }>; label: string; detail: string } {
  const filePath = (input.file_path as string) || "";
  const fileName = filePath ? getFileName(filePath) : "";

  switch (tool) {
    case "Write":
      return { Icon: FilePlus, label: "创建文件", detail: fileName || filePath };
    case "Edit":
      return { Icon: FileEdit, label: "编辑文件", detail: fileName || filePath };
    case "Read":
      return { Icon: FileText, label: "读取文件", detail: fileName || filePath };
    case "Bash": {
      const cmd = (input.command as string) || "";
      const short = cmd.length > 60 ? cmd.slice(0, 60) + "…" : cmd;
      return { Icon: Terminal, label: "执行命令", detail: short };
    }
    case "WebFetch":
      return { Icon: Globe, label: "Web Fetch", detail: (input.url as string) || "" };
    case "WebSearch":
      return { Icon: Search, label: "Web Search", detail: (input.query as string) || "" };
    default:
      return { Icon: Wrench, label: tool, detail: "" };
  }
}

export function ArtifactCard({ toolUse, toolResult, conversationId }: ArtifactCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { Icon, label, detail } = getToolSummary(toolUse.tool, toolUse.input, toolResult);

  return (
    <div className="my-1 animate-fade-in border-l-2 border-gray-200 pl-3">
      {/* Collapsed single-line header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <Icon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        <span className="font-medium text-gray-600">{label}</span>
        <span className="flex-1 truncate font-mono text-[12px] text-gray-400">{detail}</span>
        <ChevronRight
          className={`h-3.5 w-3.5 shrink-0 text-gray-300 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
        />
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-1 overflow-hidden">
          {renderExpanded(toolUse, toolResult, conversationId)}
        </div>
      )}
    </div>
  );
}

function renderExpanded(
  toolUse: NormalizedEvent & { type: "tool_use" },
  toolResult?: { output: string; success: boolean },
  conversationId?: string,
) {
  switch (toolUse.tool) {
    case "Edit":
      return <EditArtifact input={toolUse.input} conversationId={conversationId} />;
    case "Write":
      return <FileArtifact input={toolUse.input} conversationId={conversationId} />;
    case "Read":
      return <ReadArtifact input={toolUse.input} result={toolResult} />;
    case "Bash":
      return <BashArtifact input={toolUse.input} result={toolResult} />;
    case "WebFetch":
    case "WebSearch":
      return <WebArtifact input={toolUse.input} result={toolResult} />;
    default:
      return <GenericToolCard toolUse={toolUse} />;
  }
}
