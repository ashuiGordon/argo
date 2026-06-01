import { useState } from "react";

interface PdfPreviewProps {
  url: string;
  title?: string;
  height?: number;
  onFullscreen?: () => void;
}

export function PdfPreview({ url, title, height = 480, onFullscreen }: PdfPreviewProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="my-2 overflow-hidden rounded-[var(--radius-sm)] border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <svg className="h-3.5 w-3.5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-xs font-medium text-gray-600 truncate" title={title}>{title || "PDF"}</span>
        </div>
        <div className="flex gap-2 shrink-0">
          <span className="text-[10px] text-gray-400">{loaded ? "Loaded" : "Loading..."}</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            Open
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
      <div className="relative w-full bg-gray-100" style={{ height }}>
        <iframe
          src={url}
          className="h-full w-full border-0"
          onLoad={() => setLoaded(true)}
          title={title || "PDF"}
        />
      </div>
    </div>
  );
}
