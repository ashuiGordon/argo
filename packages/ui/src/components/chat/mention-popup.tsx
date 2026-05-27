import { useEffect, useRef } from "react";

export interface MentionItem {
  id: string;
  label: string;
  detail?: string;
  iconColor?: string;
}

interface MentionPopupProps {
  items: MentionItem[];
  activeIndex: number;
  onSelect: (item: MentionItem) => void;
  onClose: () => void;
  type: "file" | "agent";
}

export function MentionPopup({ items, activeIndex, onSelect, onClose, type }: MentionPopupProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const active = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (items.length === 0) {
    return (
      <div className="absolute bottom-full left-0 right-0 mb-2 rounded-[10px] border border-gray-200 bg-white py-2 px-3 shadow-lg z-50">
        <p className="text-[12px] text-gray-400">
          {type === "file" ? "No files found" : "No agents found"}
        </p>
      </div>
    );
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 rounded-[10px] border border-gray-200 bg-white shadow-lg z-50 overflow-hidden">
      <div ref={listRef} className="max-h-[220px] overflow-y-auto py-1">
        {items.map((item, i) => (
          <button
            key={item.id}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(item);
            }}
            className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors cursor-pointer ${
              i === activeIndex ? "bg-gray-100" : "hover:bg-gray-50"
            }`}
          >
            {type === "file" ? (
              <svg className="h-3.5 w-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            ) : (
              <div
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                style={{ backgroundColor: item.iconColor || "#6b7280" }}
              >
                {item.label[0]}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="block truncate text-[13px] text-gray-900">{item.label}</span>
              {item.detail && (
                <span className="block truncate text-[11px] text-gray-400">{item.detail}</span>
              )}
            </div>
          </button>
        ))}
      </div>
      <div className="border-t border-gray-100 px-3 py-1.5">
        <span className="text-[10px] text-gray-400">
          ↑↓ navigate · Enter select · Esc close
        </span>
      </div>
    </div>
  );
}
