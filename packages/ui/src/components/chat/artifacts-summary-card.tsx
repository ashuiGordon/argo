import { FileText, Image, FileCode, Table, Presentation, Eye } from "lucide-react";
import { useWorkspacePanelStore } from "../../stores/workspace-panel";

interface ArtifactFile {
  filePath: string;
  fileName: string;
  ext: string;
  content?: string;
}

interface ArtifactsSummaryCardProps {
  files: ArtifactFile[];
}

function getFileIcon(ext: string) {
  if (["html", "htm"].includes(ext)) return <FileCode className="h-4 w-4 text-orange-500" />;
  if (["pdf"].includes(ext)) return <FileText className="h-4 w-4 text-red-500" />;
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return <Image className="h-4 w-4 text-green-500" />;
  if (["docx", "doc"].includes(ext)) return <FileText className="h-4 w-4 text-blue-500" />;
  if (["xlsx", "xls"].includes(ext)) return <Table className="h-4 w-4 text-green-600" />;
  if (["pptx", "ppt"].includes(ext)) return <Presentation className="h-4 w-4 text-orange-600" />;
  return <FileText className="h-4 w-4 text-gray-400" />;
}

export function ArtifactsSummaryCard({ files }: ArtifactsSummaryCardProps) {
  const setPreviewHtml = useWorkspacePanelStore((s) => s.setPreviewHtml);
  const setPreviewUrl = useWorkspacePanelStore((s) => s.setPreviewUrl);

  function handlePreview(file: ArtifactFile) {
    const { ext, filePath, fileName, content } = file;

    if (["html", "htm"].includes(ext) && content) {
      setPreviewHtml(content, fileName);
      return;
    }

    // PPTX still needs LibreOffice PDF conversion (no good JS viewer)
    if (["pptx", "ppt"].includes(ext)) {
      const url = `/api/system/file-as-pdf?path=${encodeURIComponent(filePath)}`;
      setPreviewUrl(url, fileName);
      return;
    }

    // DOCX, XLSX, PDF, images — use raw file (frontend handles rendering)
    const url = `/api/system/file-raw?path=${encodeURIComponent(filePath)}`;
    setPreviewUrl(url, fileName);
  }

  if (files.length === 0) return null;

  return (
    <div className="pl-4 my-2 animate-fade-in">
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
          <span className="text-[12px] font-medium text-gray-500">产物文件</span>
          <span className="rounded-full bg-gray-200 px-1.5 text-[10px] text-gray-500">{files.length}</span>
        </div>
        <div className="divide-y divide-gray-100">
          {files.map((file) => (
            <div key={file.filePath} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors">
              {getFileIcon(file.ext)}
              <span className="flex-1 truncate font-mono text-[12px] text-gray-700">{file.fileName}</span>
              <span className="text-[10px] text-gray-400 uppercase shrink-0">{file.ext}</span>
              <button
                onClick={() => handlePreview(file)}
                className="flex items-center gap-1 shrink-0 rounded-md border border-gray-200 px-2 py-0.5 text-[11px] text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <Eye className="h-3 w-3" />
                预览
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
