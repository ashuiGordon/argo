interface TeamProgressBarProps {
  phase: string;
  previousPhase?: string;
  presetId?: string;
}

export function TeamProgressBar({ phase, previousPhase }: TeamProgressBarProps) {
  const isTransitioning = previousPhase && previousPhase !== phase;

  return (
    <div className="border-b border-gray-100 bg-gray-50/50 px-4 py-2.5">
      <div className="flex items-center gap-2">
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-600 ring-2 ring-blue-200">
          <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 1015 0 7.5 7.5 0 00-15 0z" strokeDasharray="40" strokeDashoffset="10" />
          </svg>
        </div>
        <span className="text-[12px] font-medium text-blue-600 capitalize">{phase}</span>
        {isTransitioning && (
          <span className="text-[11px] text-gray-400">
            (from {previousPhase})
          </span>
        )}
      </div>
    </div>
  );
}
