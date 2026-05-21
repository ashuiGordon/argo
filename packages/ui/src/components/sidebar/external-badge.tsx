interface ExternalBadgeProps {
  className?: string;
}

export function ExternalBadge({ className = "" }: ExternalBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded border border-dashed border-zinc-600 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 ${className}`}
    >
      External
    </span>
  );
}
