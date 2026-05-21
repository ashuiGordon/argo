import { useState, useEffect } from "react";
import { APPROVAL_TIMEOUT_MS } from "@argo/shared";

interface TimeoutIndicatorProps {
  createdAt: string;
}

export function TimeoutIndicator({ createdAt }: TimeoutIndicatorProps) {
  const [remaining, setRemaining] = useState(APPROVAL_TIMEOUT_MS);

  useEffect(() => {
    const start = new Date(createdAt).getTime();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const left = Math.max(0, APPROVAL_TIMEOUT_MS - elapsed);
      setRemaining(left);
      if (left === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  const seconds = Math.ceil(remaining / 1000);
  const pct = (remaining / APPROVAL_TIMEOUT_MS) * 100;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>Auto-deny in {seconds}s</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-zinc-700">
        <div
          className="h-full rounded-full bg-amber-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
