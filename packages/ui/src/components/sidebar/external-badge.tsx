interface ExternalBadgeProps {
  className?: string;
}

export function ExternalBadge({ className = "" }: ExternalBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded border border-dashed border-gray-400 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 ${className}`}
    >
      External
    </span>
  );
}
