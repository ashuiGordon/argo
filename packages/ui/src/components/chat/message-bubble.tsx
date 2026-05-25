import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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

function CodeBlock({ children, className }: { children?: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  const text = String(children).replace(/\n$/, "");
  const lang = className?.replace("language-", "") || "";

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <div className="group/code relative">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-1.5 rounded-t-[var(--radius-sm)]">
        <span className="font-mono text-[10px] uppercase tracking-[0.28px] text-gray-500">{lang || "code"}</span>
        <button
          onClick={handleCopy}
          className="text-[10px] text-gray-400 opacity-0 transition-opacity hover:text-gray-700 group-hover/code:opacity-100 cursor-pointer"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <code className={className}>{children}</code>
    </div>
  );
}

export function MessageBubble({ event }: MessageBubbleProps) {
  const [showFullscreen, setShowFullscreen] = useState(false);

  if (event.type !== "message") return null;

  const isUser = event.role === "user";
  const html = !isUser ? extractHtml(event.content) : null;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4 animate-fade-in`}>
      <div
        className={`max-w-[75%] rounded-[var(--radius-lg)] px-4 py-3 ${
          isUser
            ? "bg-gray-900 text-white"
            : "bg-gray-50 border border-gray-200 text-gray-900"
        }`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap break-words text-[14px] leading-[1.5]">
            {event.content}
          </div>
        ) : (
          <div className="prose prose-sm max-w-none break-words text-[14px] leading-[1.5] prose-p:my-1.5 prose-pre:my-2.5 prose-pre:rounded-[var(--radius-sm)] prose-pre:bg-gray-100 prose-pre:p-0 prose-pre:overflow-hidden prose-code:text-red-600 prose-code:font-mono prose-headings:text-gray-900 prose-headings:font-display prose-headings:tracking-tight prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                pre({ children }) {
                  return <pre className="relative">{children}</pre>;
                },
                code({ children, className }) {
                  const isBlock = className?.startsWith("language-") || false;
                  if (isBlock) {
                    return <CodeBlock className={className}>{children}</CodeBlock>;
                  }
                  return <code className={`${className || ""} rounded-[3px] bg-gray-100 px-1.5 py-0.5 text-[13px]`}>{children}</code>;
                },
              }}
            >
              {event.content}
            </ReactMarkdown>
          </div>
        )}
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
