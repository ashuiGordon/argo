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
      <h3 className="text-sm font-medium text-gray-700">{title}</h3>
      {description && <p className="max-w-xs text-xs text-gray-500">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 rounded-[var(--radius-sm)] bg-gray-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-gray-800 cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
