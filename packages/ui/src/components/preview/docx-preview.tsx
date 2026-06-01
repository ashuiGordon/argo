import { useEffect, useState } from "react";

interface DocxPreviewProps {
  url: string;
  title?: string;
  height?: number;
  onFullscreen?: () => void;
}

export function DocxPreview({ url, title, height = 480, onFullscreen }: DocxPreviewProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHtml(null);
    setError(null);
    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        const buffer = await res.arrayBuffer();
        const mammoth = await import("mammoth");
        const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
        if (!cancelled) setHtml(result.value);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to render DOCX");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className="my-2 overflow-hidden rounded-[var(--radius-sm)] border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <svg className="h-3.5 w-3.5 shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-xs font-medium text-gray-600 truncate" title={title}>{title || "Document"}</span>
        </div>
        <div className="flex gap-2 shrink-0">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            Download
          </a>
          {onFullscreen && (
            <button
              onClick={onFullscreen}
              className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              Fullscreen
            </button>
          )}
        </div>
      </div>
      <div className="overflow-auto bg-white" style={{ maxHeight: height }}>
        {error && (
          <div className="px-4 py-3 text-xs text-red-600">Failed to render: {error}</div>
        )}
        {!html && !error && (
          <div className="flex items-center justify-center px-4 py-10 text-xs text-gray-400">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-400 mr-2" />
            Rendering...
          </div>
        )}
        {html && (
          <div
            className="prose prose-sm max-w-none px-6 py-5 text-gray-800"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>
    </div>
  );
}
