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
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <span className="text-sm font-medium text-gray-900">{title || "Preview"}</span>
        <div className="flex items-center gap-3">
          {(Object.keys(DEVICE_SIZES) as DeviceSize[]).map((d) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              className={`rounded-[var(--radius-sm)] px-3 py-1 text-xs cursor-pointer ${
                device === d ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {DEVICE_SIZES[d].label}
            </button>
          ))}
          <button
            onClick={onClose}
            className="ml-4 rounded-[var(--radius-sm)] border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
      <div className="flex flex-1 items-start justify-center overflow-auto bg-gray-100 p-4">
        <div
          className="h-full overflow-hidden rounded-[var(--radius-sm)] border border-gray-200 bg-white shadow-lg transition-all"
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
