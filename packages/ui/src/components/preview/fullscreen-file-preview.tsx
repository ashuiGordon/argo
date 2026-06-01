import { useFilePreviewStore } from "../../stores/file-preview";
import { FilePreview } from "./file-preview";

function fileNameOf(filePath: string): string {
  return filePath.split("/").pop() || filePath;
}

export function FullscreenFilePreview() {
  const { isOpen, filePath, close } = useFilePreviewStore();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <span className="text-sm font-medium text-gray-900 truncate">{fileNameOf(filePath)}</span>
        <button
          onClick={close}
          className="rounded-[var(--radius-sm)] border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
        >
          Close
        </button>
      </div>
      <div className="flex-1 overflow-auto bg-gray-100 p-4">
        <div className="mx-auto max-w-5xl">
          <FilePreview filePath={filePath} height={Math.max(window.innerHeight - 160, 480)} />
        </div>
      </div>
    </div>
  );
}
