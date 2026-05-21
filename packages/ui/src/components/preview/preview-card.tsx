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
    <div className="my-2 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-700 px-3 py-2">
        <span className="text-xs font-medium text-zinc-400">{title || "Preview"}</span>
        <div className="flex gap-2">
          <span className="text-[10px] text-zinc-500">
            {loaded ? "Loaded" : "Loading..."}
          </span>
          {onFullscreen && (
            <button
              onClick={onFullscreen}
              className="text-xs text-blue-400 hover:text-blue-300"
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
