import { useState, useMemo } from "react";

interface PreviewCardProps {
  html?: string;
  url?: string;
  title?: string;
  height?: number;
  onFullscreen?: () => void;
}

export function PreviewCard({ html, url, title, height = 256, onFullscreen }: PreviewCardProps) {
  const [loaded, setLoaded] = useState(false);

  const src = useMemo(() => {
    if (url) return url;
    if (html) {
      const blob = new Blob([html], { type: "text/html" });
      return URL.createObjectURL(blob);
    }
    return "";
  }, [html, url]);

  const sandbox = url ? "allow-scripts allow-same-origin allow-forms allow-popups" : "allow-scripts";

  return (
    <div className="my-2 overflow-hidden rounded-[var(--radius-sm)] border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
        <span className="text-xs font-medium text-gray-600 truncate" title={title}>{title || "预览"}</span>
        <div className="flex gap-2 shrink-0">
          <span className="text-[10px] text-gray-400">
            {loaded ? "已加载" : "加载中..."}
          </span>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              Open
            </a>
          )}
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
      <div className="relative w-full bg-white" style={{ height }}>
        <iframe
          src={src}
          sandbox={sandbox}
          className="h-full w-full border-0"
          onLoad={() => setLoaded(true)}
          title={title || "预览"}
        />
      </div>
    </div>
  );
}
