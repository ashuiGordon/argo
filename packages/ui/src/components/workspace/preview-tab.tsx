import { useMemo, useCallback, useState } from "react";
import { Monitor, Tablet, Smartphone } from "lucide-react";
import { useWorkspacePanelStore } from "../../stores/workspace-panel";
import { DocxViewer } from "./docx-viewer";
import { XlsxViewer } from "./xlsx-viewer";

type DeviceMode = "desktop" | "tablet" | "mobile";

const DEVICES: Record<DeviceMode, { width: string; height: string; label: string; Icon: typeof Monitor }> = {
  desktop: { width: "100%", height: "100%", label: "桌面", Icon: Monitor },
  tablet: { width: "768px", height: "1024px", label: "平板 (768×1024)", Icon: Tablet },
  mobile: { width: "375px", height: "812px", label: "手机 (375×812)", Icon: Smartphone },
};

export function PreviewTab() {
  const { previewUrl, previewHtml, previewTitle } = useWorkspacePanelStore();
  const [device, setDevice] = useState<DeviceMode>("desktop");

  const src = useMemo(() => {
    if (previewUrl) return previewUrl;
    if (previewHtml) {
      const blob = new Blob([previewHtml], { type: "text/html" });
      return URL.createObjectURL(blob);
    }
    return "";
  }, [previewUrl, previewHtml]);

  const handleRefresh = useCallback(() => {
    const iframe = document.getElementById("workspace-preview-iframe") as HTMLIFrameElement | null;
    if (iframe) iframe.src = iframe.src;
  }, []);

  const currentDevice = DEVICES[device];
  const isPdf = previewUrl?.includes("file-as-pdf") || previewUrl?.endsWith(".pdf") || previewTitle?.endsWith(".pdf");
  const isDocx = previewTitle?.endsWith(".docx") || previewTitle?.endsWith(".doc");
  const isXlsx = previewTitle?.endsWith(".xlsx") || previewTitle?.endsWith(".xls");

  return (
    <div className="flex h-full flex-col min-h-0 overflow-hidden">
      {/* Browser toolbar */}
      <div className="flex items-center gap-2 border-b border-gray-200 bg-[#fafafa] px-3 py-1.5 shrink-0">
        <div className="flex items-center gap-1">
          <button className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 cursor-pointer">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 cursor-pointer">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
          <button onClick={handleRefresh} className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 cursor-pointer">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>
        <div className="flex-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-500 font-mono truncate">
          {previewUrl || previewTitle || "/"}
        </div>
        {/* Device switcher */}
        <div className="flex items-center gap-0.5 border-l border-gray-200 pl-2">
          {(Object.entries(DEVICES) as [DeviceMode, typeof DEVICES["desktop"]][]).map(([key, { Icon, label }]) => (
            <button
              key={key}
              onClick={() => setDevice(key)}
              className={`flex h-6 w-6 items-center justify-center rounded cursor-pointer transition-colors ${
                device === key ? "bg-gray-200 text-gray-700" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              }`}
              title={label}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
        {previewUrl && (
          <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 cursor-pointer">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
        )}
      </div>
      {/* Content area */}
      <div className={`flex-1 min-h-0 flex items-start justify-center overflow-auto ${
        device === "desktop" ? "bg-white" : "bg-gray-100 p-4"
      }`}>
        {src ? (
          isDocx && previewUrl ? (
            <DocxViewer url={previewUrl} title={previewTitle} />
          ) : isXlsx && previewUrl ? (
            <XlsxViewer url={previewUrl} title={previewTitle} />
          ) : (
            <div
              className={`transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
                device !== "desktop" ? "rounded-xl border border-gray-300 shadow-lg bg-white" : "w-full h-full"
              }`}
              style={device !== "desktop" ? {
                width: currentDevice.width,
                height: currentDevice.height,
                maxWidth: "100%",
                maxHeight: "100%",
              } : undefined}
            >
              {isPdf ? (
                <embed
                  src={src}
                  type="application/pdf"
                  className={`w-full h-full ${device !== "desktop" ? "rounded-xl" : ""}`}
                  title={previewTitle}
                />
              ) : (
                <iframe
                  id="workspace-preview-iframe"
                  src={src}
                  sandbox={previewUrl ? "allow-scripts allow-same-origin allow-forms allow-popups" : "allow-scripts"}
                  className={`w-full h-full border-0 block ${device !== "desktop" ? "rounded-xl" : ""}`}
                  title={previewTitle}
                />
              )}
            </div>
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400 text-sm">
            No preview available
          </div>
        )}
      </div>
    </div>
  );
}
