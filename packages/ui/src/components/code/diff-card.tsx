import { useState } from "react";

interface DiffCardProps {
  fileName: string;
  oldContent: string;
  newContent: string;
}

export function DiffCard({ fileName, oldContent, newContent }: DiffCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const lines = computeDiff(oldContent, newContent);

  return (
    <div className="my-2 overflow-hidden rounded-[var(--radius-sm)] border border-gray-200 bg-white">
      <div
        className="flex cursor-pointer items-center justify-between border-b border-gray-200 px-3 py-2"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="text-xs font-mono text-gray-700">{fileName}</span>
        <span className="text-[10px] text-gray-400">{collapsed ? "▸" : "▾"}</span>
      </div>
      {!collapsed && (
        <div className="overflow-x-auto p-0 font-mono text-xs leading-5">
          {lines.map((line, i) => (
            <div
              key={i}
              className={`px-3 ${
                line.type === "add"
                  ? "bg-green-50 text-green-800"
                  : line.type === "remove"
                    ? "bg-red-50 text-red-800"
                    : "text-gray-600"
              }`}
            >
              <span className="mr-3 inline-block w-4 text-right text-gray-400">
                {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
              </span>
              {line.content}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface DiffLine {
  type: "add" | "remove" | "context";
  content: string;
}

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const result: DiffLine[] = [];

  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === newLine) {
      result.push({ type: "context", content: oldLine || "" });
    } else {
      if (oldLine !== undefined) {
        result.push({ type: "remove", content: oldLine });
      }
      if (newLine !== undefined) {
        result.push({ type: "add", content: newLine });
      }
    }
  }

  return result;
}
