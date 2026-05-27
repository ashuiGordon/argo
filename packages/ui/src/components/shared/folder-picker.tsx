import { useEffect, useState } from "react";
import { api } from "../../services/api-client";

interface FolderPickerProps {
  value: string;
  onChange: (path: string) => void;
}

interface DirEntry {
  name: string;
  path: string;
}

export function FolderPicker({ value, onChange }: FolderPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState("");
  const [parentPath, setParentPath] = useState("");
  const [directories, setDirectories] = useState<DirEntry[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<DirEntry[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadDirectory(path?: string) {
    setLoading(true);
    try {
      const res = await api.system.listDirectories(path);
      setCurrentPath(res.current);
      setParentPath(res.parent);
      setDirectories(res.directories);
      setBreadcrumbs(res.breadcrumbs);
    } catch {
      // fallback
    }
    setLoading(false);
  }

  async function handleNativePicker() {
    try {
      const res = await api.system.pickFolder();
      if (res.path) {
        onChange(res.path);
        setIsOpen(false);
      }
    } catch {
      // native picker not available, open browser
      setIsOpen(true);
      loadDirectory();
    }
  }

  function handleOpen() {
    handleNativePicker();
  }

  function handleSelectCurrent() {
    onChange(currentPath);
    setIsOpen(false);
  }

  function handleNavigate(path: string) {
    loadDirectory(path);
  }

  useEffect(() => {
    if (isOpen && !currentPath) {
      loadDirectory();
    }
  }, [isOpen]);

  return (
    <div>
      <div className="flex items-center gap-2">
        <div
          className={`flex-1 rounded-[var(--radius-sm)] border px-3 py-2 text-[13px] ${
            value ? "border-gray-300 text-gray-900" : "border-gray-200 text-gray-400"
          }`}
        >
          {value || "No folder selected"}
        </div>
        <button
          type="button"
          onClick={handleOpen}
          className="rounded-[var(--radius-sm)] border border-gray-300 bg-white px-3 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
        >
          Browse…
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30" onClick={() => setIsOpen(false)}>
          <div
            className="w-full max-w-lg rounded-[var(--radius-md)] border border-gray-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b border-gray-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[14px] font-semibold text-gray-900">Select Folder</h3>
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {/* Breadcrumbs */}
              <div className="mt-2 flex items-center gap-1 overflow-x-auto text-[11px]">
                <button
                  onClick={() => handleNavigate("/")}
                  className="shrink-0 text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  /
                </button>
                {breadcrumbs.map((crumb, i) => (
                  <span key={crumb.path} className="flex items-center gap-1">
                    <span className="text-gray-300">/</span>
                    <button
                      onClick={() => handleNavigate(crumb.path)}
                      className={`shrink-0 cursor-pointer ${
                        i === breadcrumbs.length - 1
                          ? "font-medium text-gray-900"
                          : "text-blue-600 hover:text-blue-800"
                      }`}
                    >
                      {crumb.name}
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Directory list */}
            <div className="max-h-[320px] overflow-y-auto px-2 py-2">
              {currentPath !== parentPath && (
                <button
                  onClick={() => handleNavigate(parentPath)}
                  className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-[13px] text-gray-500 hover:bg-gray-100 cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                  ..
                </button>
              )}
              {loading ? (
                <div className="py-8 text-center text-[12px] text-gray-400">Loading…</div>
              ) : directories.length === 0 ? (
                <div className="py-8 text-center text-[12px] text-gray-400">No subdirectories</div>
              ) : (
                directories.map((dir) => (
                  <button
                    key={dir.path}
                    onClick={() => handleNavigate(dir.path)}
                    className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-[13px] text-gray-900 hover:bg-gray-100 cursor-pointer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    {dir.name}
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
              <span className="text-[11px] text-gray-500 truncate max-w-[280px]">{currentPath}</span>
              <button
                onClick={handleSelectCurrent}
                className="rounded-[var(--radius-sm)] bg-gray-900 px-4 py-1.5 text-[12px] font-medium text-white hover:opacity-90 cursor-pointer"
              >
                Select This Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
