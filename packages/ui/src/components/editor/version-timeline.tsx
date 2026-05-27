import type { FileVersion } from "../../stores/file-versions";

interface VersionTimelineProps {
  versions: FileVersion[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

export function VersionTimeline({ versions, currentIndex, onSelect }: VersionTimelineProps) {
  return (
    <div className="w-48 shrink-0 border-l border-gray-200 bg-gray-50 overflow-y-auto">
      <div className="px-3 py-3">
        <h4 className="text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-3">
          Versions ({versions.length})
        </h4>
        <div className="space-y-1">
          {versions.map((version, idx) => {
            const isActive = idx === currentIndex;
            const time = new Date(version.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <button
                key={version.sequence}
                onClick={() => onSelect(idx)}
                className={`flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-2 text-left transition-colors cursor-pointer ${
                  isActive ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-100"
                }`}
              >
                <div className={`h-2 w-2 shrink-0 rounded-full ${
                  isActive ? "bg-blue-500" : "bg-gray-300"
                }`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-medium ${
                      version.type === "write" ? "text-green-600" : "text-orange-600"
                    }`}>
                      {version.type === "write" ? "Write" : "Edit"}
                    </span>
                    <span className="text-[10px] text-gray-400">#{idx + 1}</span>
                  </div>
                  <span className="text-[10px] text-gray-500">{time}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
