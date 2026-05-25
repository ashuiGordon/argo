interface Conflict {
  id: string;
  description: string;
  agents: string[];
  options: Array<{ agentName: string; suggestion: string }>;
}

interface ConflictResolverProps {
  conflicts: Conflict[];
  onResolve: (conflictId: string, chosenAgent: string) => void;
  onDismiss: (conflictId: string) => void;
}

export function ConflictResolver({ conflicts, onResolve, onDismiss }: ConflictResolverProps) {
  if (conflicts.length === 0) return null;

  return (
    <div className="space-y-3">
      {conflicts.map((conflict) => (
        <div
          key={conflict.id}
          className="rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 p-4"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-semibold text-amber-700">Conflict Detected</span>
          </div>
          <p className="mb-3 text-sm text-gray-700">{conflict.description}</p>
          <div className="mb-3 space-y-2">
            {conflict.options.map((option) => (
              <button
                key={option.agentName}
                onClick={() => onResolve(conflict.id, option.agentName)}
                className="flex w-full items-start gap-2 rounded-[var(--radius-sm)] border border-gray-200 p-2 text-left hover:bg-gray-50 cursor-pointer"
              >
                <span className="shrink-0 text-xs font-medium text-blue-600">{option.agentName}:</span>
                <span className="text-xs text-gray-700">{option.suggestion}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => onDismiss(conflict.id)}
            className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
