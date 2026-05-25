import { useState } from "react";

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="group relative my-2 rounded-[var(--radius-sm)] border border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-1.5">
        <span className="text-xs text-gray-500">{language || "code"}</span>
        <button
          onClick={handleCopy}
          className="text-xs text-gray-400 opacity-0 transition-opacity hover:text-gray-700 group-hover:opacity-100 cursor-pointer"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3">
        <code className="text-xs text-gray-800">{code}</code>
      </pre>
    </div>
  );
}
