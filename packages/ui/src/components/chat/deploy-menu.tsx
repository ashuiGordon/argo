import { useState, useRef, useEffect } from "react";
import { api } from "../../services/api-client";

interface DeployMenuProps {
  conversationId: string;
  workspace: string;
  sessionId?: string;
}

const DEPLOY_OPTIONS = [
  {
    type: "preview" as const,
    target: "local" as const,
    label: "Preview",
    description: "Local dev server with shareable URL",
    icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
  },
  {
    type: "static" as const,
    target: "vercel" as const,
    label: "Vercel",
    description: "Deploy static site to Vercel",
    icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    type: "static" as const,
    target: "netlify" as const,
    label: "Netlify",
    description: "Deploy static site to Netlify",
    icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    type: "container" as const,
    target: "docker" as const,
    label: "Docker",
    description: "Build and run Docker container",
    icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  },
  {
    type: "package" as const,
    target: "zip" as const,
    label: "Download ZIP",
    description: "Package source as ZIP archive",
    icon: "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3",
  },
];

export function DeployMenu({ conversationId, workspace, sessionId }: DeployMenuProps) {
  const [open, setOpen] = useState(false);
  const [deploying, setDeploying] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleDeploy(type: "preview" | "static" | "container" | "package", target: string) {
    setDeploying(target);
    try {
      await api.deployments.create({
        conversationId,
        type,
        target,
        workspace,
        sessionId,
      });
      setOpen(false);
    } catch {
      // error handled by deploy status event
    } finally {
      setDeploying(null);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors cursor-pointer ${
          open
            ? "bg-green-100 text-green-600"
            : "text-gray-400 hover:bg-gray-200 hover:text-gray-600"
        }`}
        title="Deploy"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-64 rounded-[var(--radius-md)] border border-gray-200 bg-white py-1 shadow-lg z-50">
          <div className="px-3 py-1.5 border-b border-gray-100">
            <span className="text-[11px] font-500 text-gray-500 uppercase tracking-wider">Deploy</span>
          </div>
          {DEPLOY_OPTIONS.map((opt) => (
            <button
              key={`${opt.type}-${opt.target}`}
              onClick={() => handleDeploy(opt.type, opt.target)}
              disabled={deploying !== null}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 disabled:opacity-50 cursor-pointer transition-colors"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100">
                <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={opt.icon} />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-500 text-gray-900">
                  {opt.label}
                  {deploying === opt.target && (
                    <span className="ml-2 text-[11px] text-blue-500">Starting...</span>
                  )}
                </div>
                <div className="text-[11px] text-gray-500 truncate">{opt.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
