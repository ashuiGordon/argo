import type { NormalizedEvent } from "@argo/shared";
import {
  EditArtifact,
  FileArtifact,
  ReadArtifact,
  BashArtifact,
  WebArtifact,
  GenericToolCard,
} from "./artifacts";

interface ArtifactCardProps {
  toolUse: NormalizedEvent & { type: "tool_use" };
  toolResult?: { output: string; success: boolean };
  conversationId?: string;
}

export function ArtifactCard({ toolUse, toolResult, conversationId }: ArtifactCardProps) {
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
