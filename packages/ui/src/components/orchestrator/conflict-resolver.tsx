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
          className="rounded-lg border border-amber-700/50 bg-amber-950/20 p-4"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-semibold text-amber-300">Conflict Detected</span>
          </div>
          <p className="mb-3 text-sm text-zinc-300">{conflict.description}</p>
          <div className="mb-3 space-y-2">
            {conflict.options.map((option) => (
              <button
                key={option.agentName}
                onClick={() => onResolve(conflict.id, option.agentName)}
                className="flex w-full items-start gap-2 rounded border border-zinc-700 p-2 text-left hover:bg-zinc-800"
              >
                <span className="shrink-0 text-xs font-medium text-blue-400">{option.agentName}:</span>
                <span className="text-xs text-zinc-300">{option.suggestion}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => onDismiss(conflict.id)}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
