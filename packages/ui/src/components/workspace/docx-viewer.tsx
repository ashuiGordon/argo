import { useEffect, useRef, useState } from "react";
import { renderAsync } from "docx-preview";

interface DocxViewerProps {
  url: string;
  title?: string;
}

export function DocxViewer({ url, title }: DocxViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    setLoading(true);
    setError(null);

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        return res.arrayBuffer();
      })
      .then((buffer) => {
        if (!containerRef.current) return;
        containerRef.current.innerHTML = "";
        return renderAsync(buffer, containerRef.current, undefined, {
          className: "docx-preview-wrapper",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          ignoreLastRenderedPageBreak: true,
          experimental: true,
        });
      })
      .then(() => setLoading(false))
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [url]);

  return (
    <div className="h-full w-full overflow-auto bg-gray-100 p-4">
      {loading && (
        <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
          Loading document...
        </div>
      )}
      {error && (
        <div className="flex items-center justify-center py-12 text-red-400 text-sm">
          {error}
        </div>
      )}
      <div
        ref={containerRef}
        className="mx-auto bg-white shadow-sm rounded-lg overflow-hidden"
        style={{ maxWidth: "800px" }}
      />
      <style>{`
        .docx-preview-wrapper {
          padding: 20px 40px;
          min-height: 100%;
        }
        .docx-preview-wrapper p {
          margin: 0.5em 0;
        }
        .docx-preview-wrapper table {
          border-collapse: collapse;
          width: 100%;
        }
        .docx-preview-wrapper td, .docx-preview-wrapper th {
          border: 1px solid #e5e7eb;
          padding: 6px 10px;
        }
      `}</style>
    </div>
  );
}
