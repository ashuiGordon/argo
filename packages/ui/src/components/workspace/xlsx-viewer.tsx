import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

interface XlsxViewerProps {
  url: string;
  title?: string;
}

interface SheetData {
  name: string;
  html: string;
}

export function XlsxViewer({ url, title }: XlsxViewerProps) {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        return res.arrayBuffer();
      })
      .then((buffer) => {
        const workbook = XLSX.read(buffer, { type: "array" });
        const result: SheetData[] = [];
        for (const name of workbook.SheetNames) {
          const sheet = workbook.Sheets[name];
          const html = XLSX.utils.sheet_to_html(sheet, { editable: false });
          result.push({ name, html });
        }
        setSheets(result);
        setActiveSheet(0);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [url]);

  if (loading) {
    return <div className="flex h-full items-center justify-center text-gray-400 text-sm">Loading spreadsheet...</div>;
  }

  if (error) {
    return <div className="flex h-full items-center justify-center text-red-400 text-sm">{error}</div>;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Sheet tabs */}
      {sheets.length > 1 && (
        <div className="flex items-center gap-0 border-b border-gray-200 bg-gray-50 px-2 shrink-0 overflow-x-auto">
          {sheets.map((sheet, i) => (
            <button
              key={sheet.name}
              onClick={() => setActiveSheet(i)}
              className={`px-3 py-1.5 text-[11px] font-medium border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
                i === activeSheet
                  ? "border-blue-600 text-gray-900"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}
      {/* Table content */}
      <div className="flex-1 overflow-auto p-2">
        {sheets[activeSheet] && (
          <div
            className="xlsx-table-wrapper"
            dangerouslySetInnerHTML={{ __html: sheets[activeSheet].html }}
          />
        )}
      </div>
      <style>{`
        .xlsx-table-wrapper table {
          border-collapse: collapse;
          width: 100%;
          font-size: 12px;
          font-family: ui-monospace, 'JetBrains Mono', monospace;
        }
        .xlsx-table-wrapper td, .xlsx-table-wrapper th {
          border: 1px solid #e5e7eb;
          padding: 4px 8px;
          text-align: left;
          white-space: nowrap;
        }
        .xlsx-table-wrapper th {
          background: #f9fafb;
          font-weight: 500;
          color: #374151;
        }
        .xlsx-table-wrapper tr:hover td {
          background: #f3f4f6;
        }
      `}</style>
    </div>
  );
}
