import type { ArgoPhase } from "@argo/shared";

const PHASES: { key: ArgoPhase; label: string }[] = [
  { key: "clarify", label: "Clarify" },
  { key: "specify", label: "Specify" },
  { key: "plan", label: "Plan" },
  { key: "tasks", label: "Tasks" },
  { key: "implement", label: "Implement" },
  { key: "review", label: "Review" },
  { key: "commit", label: "Commit" },
];

interface ArgoProgressBarProps {
  phase: ArgoPhase;
  implementProgress?: { total: number; completed: number };
}

export function ArgoProgressBar({ phase, implementProgress }: ArgoProgressBarProps) {
  const currentIdx = PHASES.findIndex((p) => p.key === phase);
  const isDone = phase === "done";

  return (
    <div className="border-b border-gray-100 bg-gray-50/50 px-4 py-2.5">
      <div className="flex items-center gap-1">
        {PHASES.map((p, idx) => {
          const isCompleted = isDone || idx < currentIdx;
          const isCurrent = !isDone && idx === currentIdx;

          return (
            <div key={p.key} className="flex items-center">
              {idx > 0 && (
                <div
                  className={`mx-1 h-px w-4 ${
                    isCompleted ? "bg-green-400" : "bg-gray-200"
                  }`}
                />
              )}
              <div className="flex items-center gap-1">
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    isCompleted
                      ? "bg-green-100 text-green-600"
                      : isCurrent
                        ? "bg-blue-100 text-blue-600 ring-2 ring-blue-200"
                        : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {isCompleted ? (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </div>
                <span
                  className={`text-[11px] font-medium ${
                    isCompleted
                      ? "text-green-600"
                      : isCurrent
                        ? "text-blue-600"
                        : "text-gray-400"
                  }`}
                >
                  {p.label}
                  {isCurrent && p.key === "implement" && implementProgress && (
                    <span className="ml-0.5 text-[10px] opacity-70">
                      ({implementProgress.completed}/{implementProgress.total})
                    </span>
                  )}
                </span>
              </div>
            </div>
          );
        })}
        {isDone && (
          <>
            <div className="mx-1 h-px w-4 bg-green-400" />
            <span className="text-[11px] font-bold text-green-600">Done</span>
          </>
        )}
      </div>
    </div>
  );
}
