import { PreviewCard } from "../../preview/preview-card";

interface WebArtifactProps {
  input: Record<string, unknown>;
  result?: { output: string; success: boolean };
}

export function WebArtifact({ input, result }: WebArtifactProps) {
  const url = (input.url as string) || (input.query as string) || "";
  const output = result?.output || "";

  if (!result) {
    return (
      <div className="mb-3 ml-6 animate-fade-in rounded-[var(--radius-sm)] border border-gray-200 bg-gray-50 px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-400" />
          <span className="font-mono truncate max-w-xs">{url}</span>
          <span>Fetching...</span>
        </div>
      </div>
    );
  }

  const isHtml = output.trim().startsWith("<!DOCTYPE") || output.trim().startsWith("<html");

  if (isHtml) {
    return (
      <div className="mb-3 ml-6 animate-fade-in">
        <PreviewCard html={output} title={url} />
      </div>
    );
  }

  return (
    <div className="mb-3 ml-6 animate-fade-in overflow-hidden rounded-[var(--radius-sm)] border border-gray-200 bg-white">
      <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2">
        <svg className="h-3.5 w-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-blue-600 hover:underline truncate max-w-md"
        >
          {url}
        </a>
      </div>
      {output && (
        <div className="max-h-40 overflow-y-auto px-3 py-2 text-xs text-gray-600 leading-relaxed">
          {output.slice(0, 500)}
          {output.length > 500 && <span className="text-gray-400">...</span>}
        </div>
      )}
    </div>
  );
}
