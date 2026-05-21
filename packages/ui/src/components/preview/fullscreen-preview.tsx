import { useState } from "react";

interface FullscreenPreviewProps {
  html: string;
  title?: string;
  onClose: () => void;
}

type DeviceSize = "desktop" | "tablet" | "mobile";

const DEVICE_SIZES: Record<DeviceSize, { width: string; label: string }> = {
  desktop: { width: "100%", label: "Desktop" },
  tablet: { width: "768px", label: "Tablet" },
  mobile: { width: "375px", label: "Mobile" },
};

export function FullscreenPreview({ html, title, onClose }: FullscreenPreviewProps) {
  const [device, setDevice] = useState<DeviceSize>("desktop");
  const blob = new Blob([html], { type: "text/html" });
  const blobUrl = URL.createObjectURL(blob);
  const size = DEVICE_SIZES[device];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <span className="text-sm font-medium text-white">{title || "Preview"}</span>
        <div className="flex items-center gap-3">
          {(Object.keys(DEVICE_SIZES) as DeviceSize[]).map((d) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              className={`rounded px-3 py-1 text-xs ${
                device === d ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              {DEVICE_SIZES[d].label}
            </button>
          ))}
          <button
            onClick={onClose}
            className="ml-4 rounded bg-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-600"
          >
            Close
          </button>
        </div>
      </div>
      <div className="flex flex-1 items-start justify-center overflow-auto bg-zinc-900 p-4">
        <div
          className="h-full overflow-hidden rounded-lg border border-zinc-700 bg-white shadow-lg transition-all"
          style={{ width: size.width, maxWidth: "100%" }}
        >
          <iframe
            src={blobUrl}
            sandbox="allow-scripts"
            className="h-full w-full border-0"
            title={title || "Preview"}
          />
        </div>
      </div>
    </div>
  );
}
