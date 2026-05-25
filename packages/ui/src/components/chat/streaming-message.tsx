export function StreamingIndicator() {
  return (
    <div className="mb-4 flex justify-start animate-fade-in">
      <div className="rounded-[var(--radius-lg)] border border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-400 animate-pulse" />
          <span className="text-[12px] text-gray-500">Thinking…</span>
        </div>
      </div>
    </div>
  );
}
