import { useState } from "react";
import { api } from "../../services/api-client";
import { FullscreenPreview } from "../preview/fullscreen-preview";

interface DeployCardProps {
  deployment: {
    deploymentId: string;
    deployType: "preview" | "static" | "container" | "package";
    status: string;
    target: string;
    url?: string;
    error?: string;
    logs?: string[];
  };
}

const TYPE_ICONS: Record<string, string> = {
  preview: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
  static: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  container: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  package: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
};

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  pending: { bg: "bg-gray-50", text: "text-gray-600", dot: "bg-gray-400", label: "Pending" },
  building: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500 animate-pulse", label: "Building" },
  deployed: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500", label: "Deployed" },
  failed: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", label: "Failed" },
  cancelled: { bg: "bg-gray-50", text: "text-gray-500", dot: "bg-gray-400", label: "Cancelled" },
};

const TARGET_LABELS: Record<string, string> = {
  local: "Local Preview",
  vercel: "Vercel",
  netlify: "Netlify",
  docker: "Docker",
  fly: "Fly.io",
  zip: "ZIP Archive",
  tar: "TAR Archive",
};

export function DeployCard({ deployment }: DeployCardProps) {
  const [showLogs, setShowLogs] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const { deploymentId, deployType, status, target, url, error, logs } = deployment;
  const style = STATUS_STYLES[status] || STATUS_STYLES.pending;
  const iconPath = TYPE_ICONS[deployType] || TYPE_ICONS.package;
  const isWebPreview = (deployType === "preview" || deployType === "static") && status === "deployed" && !!url && /^https?:\/\//.test(url);

  return (
    <div className={`rounded-[var(--radius-md)] border border-gray-200 ${style.bg} overflow-hidden my-2`}>
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Type icon */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-gray-200">
          <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
          </svg>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-500 text-gray-900">
              {TARGET_LABELS[target] || target}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-500 ${style.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
              {style.label}
            </span>
          </div>
          {url && status === "deployed" && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 block truncate text-[12px] text-blue-600 hover:underline"
            >
              {url}
            </a>
          )}
          {error && (
            <p className="mt-0.5 text-[12px] text-red-600 truncate">{error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {url && deployType === "package" && status === "deployed" && (
            <a
              href={api.deployments.downloadUrl(deploymentId, url.split("/").pop() || "download")}
              className="rounded-[var(--radius-sm)] border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-500 text-gray-700 hover:bg-gray-50 transition-colors"
              download
            >
              Download
            </a>
          )}
          {url && deployType !== "package" && status === "deployed" && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-[var(--radius-sm)] border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-500 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Open
            </a>
          )}
          {isWebPreview && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="rounded-[var(--radius-sm)] border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-500 text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              {showPreview ? "Hide preview" : "Preview"}
            </button>
          )}
          {isWebPreview && (
            <button
              onClick={() => setShowFullscreen(true)}
              className="rounded-[var(--radius-sm)] border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-500 text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Fullscreen
            </button>
          )}
          {logs && logs.length > 0 && (
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="rounded-[var(--radius-sm)] border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-500 text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              {showLogs ? "Hide" : "Logs"}
            </button>
          )}
        </div>
      </div>

      {/* Logs panel */}
      {showLogs && logs && logs.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-900 px-4 py-3 max-h-40 overflow-y-auto">
          <pre className="text-[11px] font-mono text-gray-300 whitespace-pre-wrap">
            {logs.join("\n")}
          </pre>
        </div>
      )}

      {/* Inline web preview iframe */}
      {isWebPreview && showPreview && url && (
        <div className="border-t border-gray-200 bg-white">
          <iframe
            src={url}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            className="h-80 w-full border-0"
            title={`Preview ${url}`}
          />
        </div>
      )}

      {showFullscreen && url && (
        <FullscreenPreview
          url={url}
          title={url}
          onClose={() => setShowFullscreen(false)}
        />
      )}
    </div>
  );
}
