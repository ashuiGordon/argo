import { useEffect, useState } from "react";

interface OfficeAsPdfPreviewProps {
  filePath: string;
  title?: string;
  height?: number;
  onFullscreen?: () => void;
}

export function OfficeAsPdfPreview({ filePath, title, height = 480, onFullscreen }: OfficeAsPdfPreviewProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "no-soffice" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const pdfUrl = `/api/system/file-as-pdf?path=${encodeURIComponent(filePath)}`;
  const downloadUrl = `/api/system/file-raw?path=${encodeURIComponent(filePath)}`;

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setErrorMessage("");
    (async () => {
      try {
        const res = await fetch(pdfUrl, { method: "HEAD" });
        if (cancelled) return;
        if (res.status === 503) {
          setStatus("no-soffice");
          return;
        }
        if (!res.ok) {
          const text = await fetch(pdfUrl).then((r) => r.text()).catch(() => "");
          let msg = `HTTP ${res.status}`;
          try {
            const j = JSON.parse(text);
            msg = j.error?.message || msg;
          } catch {
            // ignore
          }
          setStatus("error");
          setErrorMessage(msg);
          return;
        }
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(e instanceof Error ? e.message : "Network error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  return (
    <div className="my-2 overflow-hidden rounded-[var(--radius-sm)] border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <svg className="h-3.5 w-3.5 shrink-0 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <span className="text-xs font-medium text-gray-600 truncate" title={title}>{title || "Document"}</span>
        </div>
        <div className="flex gap-2 shrink-0">
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            Download
          </a>
          {onFullscreen && status === "ready" && (
            <button
              onClick={onFullscreen}
              className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              Fullscreen
            </button>
          )}
        </div>
      </div>
      <div className="bg-gray-100" style={{ height }}>
        {status === "loading" && (
          <div className="flex h-full items-center justify-center text-xs text-gray-400">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-400 mr-2" />
            Converting to PDF...
          </div>
        )}
        {status === "ready" && (
          <iframe src={pdfUrl} className="h-full w-full border-0" title={title || "Document"} />
        )}
        {status === "no-soffice" && (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <p className="text-sm text-gray-700">LibreOffice not installed</p>
            <p className="mt-1 text-xs text-gray-500">
              Install <code className="rounded bg-gray-200 px-1 font-mono text-[11px]">libreoffice</code> (or <code className="rounded bg-gray-200 px-1 font-mono text-[11px]">brew install --cask libreoffice</code>) to enable inline preview.
            </p>
            <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="mt-3 text-xs text-blue-600 hover:text-blue-700">
              Download original file →
            </a>
          </div>
        )}
        {status === "error" && (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <p className="text-sm text-red-600">Conversion failed</p>
            {errorMessage && <p className="mt-1 text-[11px] text-gray-500">{errorMessage}</p>}
            <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="mt-3 text-xs text-blue-600 hover:text-blue-700">
              Download original file →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
