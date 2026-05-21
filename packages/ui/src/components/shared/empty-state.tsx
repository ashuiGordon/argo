interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
      {icon && <span className="text-3xl">{icon}</span>}
      <h3 className="text-sm font-medium text-zinc-300">{title}</h3>
      {description && <p className="max-w-xs text-xs text-zinc-500">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 rounded bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
