import { useState } from "react";
import type { NormalizedEvent } from "@argo/shared";
import { PreviewCard } from "../preview/preview-card";
import { FullscreenPreview } from "../preview/fullscreen-preview";

interface MessageBubbleProps {
  event: NormalizedEvent;
}

const HTML_PATTERN = /```html\n([\s\S]*?)```/;

function extractHtml(content: string): string | null {
  const match = content.match(HTML_PATTERN);
  if (match) return match[1];
  if (content.trim().startsWith("<!DOCTYPE html") || content.trim().startsWith("<html")) {
    return content;
  }
  return null;
}

export function MessageBubble({ event }: MessageBubbleProps) {
  const [showFullscreen, setShowFullscreen] = useState(false);

  if (event.type !== "message") return null;

  const isUser = event.role === "user";
  const html = !isUser ? extractHtml(event.content) : null;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2.5 ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-zinc-800 text-zinc-100"
        }`}
      >
        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
          {event.content}
        </div>
        {html && (
          <>
            <PreviewCard
              html={html}
              title="HTML Preview"
              onFullscreen={() => setShowFullscreen(true)}
            />
            {showFullscreen && (
              <FullscreenPreview
                html={html}
                title="HTML Preview"
                onClose={() => setShowFullscreen(false)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
