import { useState } from "react";

interface PreviewCardProps {
  html: string;
  title?: string;
  onFullscreen?: () => void;
}

export function PreviewCard({ html, title, onFullscreen }: PreviewCardProps) {
  const [loaded, setLoaded] = useState(false);
  const blob = new Blob([html], { type: "text/html" });
  const blobUrl = URL.createObjectURL(blob);

  return (
    <div className="my-2 overflow-hidden rounded-[var(--radius-sm)] border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
        <span className="text-xs font-medium text-gray-600">{title || "Preview"}</span>
        <div className="flex gap-2">
          <span className="text-[10px] text-gray-400">
            {loaded ? "Loaded" : "Loading..."}
          </span>
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
      <div className="relative h-64 w-full bg-white">
        <iframe
          src={blobUrl}
          sandbox="allow-scripts"
          className="h-full w-full border-0"
          onLoad={() => setLoaded(true)}
          title={title || "Preview"}
        />
      </div>
    </div>
  );
}
