import { useState } from "react";
import { PdfPreview } from "./pdf-preview";
import { PreviewCard } from "./preview-card";
import { FullscreenPreview } from "./fullscreen-preview";
import { DocxPreview } from "./docx-preview";
import { OfficeAsPdfPreview } from "./office-as-pdf-preview";

interface FilePreviewProps {
  filePath: string;
  height?: number;
}

function extensionOf(filePath: string): string {
  const parts = filePath.split(".");
  if (parts.length < 2) return "";
  return parts.pop()!.toLowerCase();
}

function fileNameOf(filePath: string): string {
  return filePath.split("/").pop() || filePath;
}

function rawUrl(filePath: string): string {
  return `/api/system/file-raw?path=${encodeURIComponent(filePath)}`;
}

export function FilePreview({ filePath, height = 480 }: FilePreviewProps) {
  const [showFullscreen, setShowFullscreen] = useState(false);
  const ext = extensionOf(filePath);
  const name = fileNameOf(filePath);
  const url = rawUrl(filePath);

  if (ext === "pdf") {
    return (
      <>
        <PdfPreview url={url} title={name} height={height} onFullscreen={() => setShowFullscreen(true)} />
        {showFullscreen && (
          <FullscreenPreview url={url} title={name} onClose={() => setShowFullscreen(false)} />
        )}
      </>
    );
  }

  if (ext === "docx") {
    return <DocxPreview url={url} title={name} height={height} />;
  }

  if (["pptx", "ppt", "doc", "xlsx", "xls"].includes(ext)) {
    return (
      <>
        <OfficeAsPdfPreview filePath={filePath} title={name} height={height} onFullscreen={() => setShowFullscreen(true)} />
        {showFullscreen && (
          <FullscreenPreview
            url={`/api/system/file-as-pdf?path=${encodeURIComponent(filePath)}`}
            title={name}
            onClose={() => setShowFullscreen(false)}
          />
        )}
      </>
    );
  }

  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) {
    return (
      <div className="my-2 overflow-hidden rounded-[var(--radius-sm)] border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
          <span className="text-xs font-medium text-gray-600 truncate">{name}</span>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer">Open</a>
        </div>
        <div className="flex items-center justify-center bg-gray-50 p-3" style={{ minHeight: 120 }}>
          <img src={url} alt={name} className="max-w-full" style={{ maxHeight: height }} />
        </div>
      </div>
    );
  }

  if (ext === "html" || ext === "htm") {
    return <PreviewCard url={url} title={name} height={height} onFullscreen={() => setShowFullscreen(true)} />;
  }

  return (
    <div className="my-2 rounded-[var(--radius-sm)] border border-gray-200 bg-gray-50 px-3 py-3 text-xs text-gray-600">
      <div className="flex items-center justify-between">
        <span className="truncate">No inline preview for <span className="font-mono">{name}</span></span>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 cursor-pointer">Download</a>
      </div>
    </div>
  );
}
