import { useState, useEffect } from "react";
import { api } from "../../services/api-client";

interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

interface GitTabProps {
  workspace?: string;
}

export function GitTab({ workspace }: GitTabProps) {
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspace) return;
    setLoading(true);
    setError(null);
    api.system.gitLog(workspace)
      .then((res) => setCommits(res.commits))
      .catch((err) => setError(err.message || "Failed to load git history"))
      .finally(() => setLoading(false));
  }, [workspace]);

  if (!workspace) {
    return <div className="flex h-full items-center justify-center text-gray-400 text-sm">No workspace</div>;
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center text-gray-400 text-sm">Loading...</div>;
  }

  if (error) {
    return <div className="flex h-full items-center justify-center text-red-400 text-sm">{error}</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-semibold text-gray-900">版本历史</h3>
        <span className="flex items-center gap-1.5 rounded bg-gray-100 px-2 py-1 text-[11px] font-mono text-gray-500">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 3v12m0 0a3 3 0 103 3 3 3 0 00-3-3zm12-6a3 3 0 10-3-3 3 3 0 003 3zm0 0v6a3 3 0 01-3 3H9" /></svg>
          main
        </span>
      </div>

      <div className="space-y-2">
        {commits.map((commit, i) => (
          <div key={commit.hash} className="flex gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors">
            <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${i === 0 ? "bg-blue-500" : "bg-gray-300"}`} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-gray-900 truncate">{commit.message}</div>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
                <span className="font-mono">{commit.hash.slice(0, 7)}</span>
                <span>{commit.date}</span>
              </div>
              <div className="flex gap-2 mt-2">
                <button className="flex items-center gap-1 rounded border border-gray-200 px-2 py-0.5 text-[11px] text-gray-500 hover:border-blue-300 hover:text-blue-600 cursor-pointer">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  查看差异
                </button>
                <button className="flex items-center gap-1 rounded border border-gray-200 px-2 py-0.5 text-[11px] text-gray-500 hover:border-blue-300 hover:text-blue-600 cursor-pointer">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
                  回退
                </button>
              </div>
            </div>
          </div>
        ))}
        {commits.length === 0 && (
          <div className="text-center text-sm text-gray-400 py-8">No commits found</div>
        )}
      </div>
    </div>
  );
}
