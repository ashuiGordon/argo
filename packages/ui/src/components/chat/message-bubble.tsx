import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { NormalizedEvent } from "@argo/shared";

interface MessageBubbleProps {
  event: NormalizedEvent;
  showAvatar?: boolean;
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
    <div className="group/code relative my-2 overflow-hidden rounded-lg">
      <div className="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-gray-400">{lang || "code"}</span>
        <button
          onClick={handleCopy}
          className="text-[10px] text-gray-500 opacity-0 transition-opacity hover:text-gray-300 group-hover/code:opacity-100 cursor-pointer"
        >
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <div className="bg-gray-900 p-3">
        <code className={`${className || ""} text-gray-200 font-mono text-[13px] leading-6`}>{children}</code>
      </div>
    </div>
  );
}

export function MessageBubble({ event, showAvatar = true }: MessageBubbleProps) {
  if (event.type !== "message") return null;

  const isUser = event.role === "user";

  if (isUser) {
    return (
      <div className="py-4 px-3 animate-fade-in">
        <div className="flex items-start gap-2.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-800 text-white text-[10px] font-bold mt-0.5">U</div>
          <div className="flex-1 min-w-0">
            <div className="inline-block rounded-2xl bg-gray-100 px-4 py-2.5 text-[14px] text-gray-900 whitespace-pre-wrap break-words leading-[1.7]">
              {event.content}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`animate-fade-in ${showAvatar ? "pt-4" : "pt-0"}`}>
      <div className="prose prose-sm max-w-none text-[15px] leading-[1.8] text-gray-800 break-words [&_p]:my-[0.3em] prose-pre:my-0 prose-pre:p-0 prose-pre:bg-transparent prose-pre:overflow-visible prose-headings:text-gray-900 prose-headings:font-semibold prose-headings:my-[0.5em] prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:font-semibold prose-strong:text-gray-900 prose-ul:my-[0.3em] prose-ol:my-[0.3em] prose-li:my-[0.2em] prose-blockquote:border-l-2 prose-blockquote:border-gray-200 prose-blockquote:text-gray-500 prose-blockquote:pl-3 prose-blockquote:my-[0.4em]">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            pre({ children }) {
              return <>{children}</>;
            },
            code({ children, className }) {
              const isBlock = className?.startsWith("language-") || false;
              if (isBlock) {
                return <CodeBlock className={className}>{children}</CodeBlock>;
              }
              return (
                <code className={`${className || ""} rounded px-[0.4em] py-[0.15em] bg-gray-100 text-[0.85em] font-mono text-gray-700 border border-gray-200/60`}>
                  {children}
                </code>
              );
            },
          }}
        >
          {event.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
