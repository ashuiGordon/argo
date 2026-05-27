import { useState } from "react";

export interface McpServerEntry {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
}

interface McpServerFormProps {
  servers: McpServerEntry[];
  onChange: (servers: McpServerEntry[]) => void;
}

const emptyServer = (): McpServerEntry => ({ name: "", command: "", args: [], env: {} });

export function McpServerForm({ servers, onChange }: McpServerFormProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [argsInput, setArgsInput] = useState<Record<number, string>>({});
  const [envKey, setEnvKey] = useState("");
  const [envVal, setEnvVal] = useState("");

  function add() {
    const next = [...servers, emptyServer()];
    onChange(next);
    setExpandedIdx(next.length - 1);
  }

  function remove(idx: number) {
    onChange(servers.filter((_, i) => i !== idx));
    if (expandedIdx === idx) setExpandedIdx(null);
  }

  function update(idx: number, patch: Partial<McpServerEntry>) {
    onChange(servers.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  function addEnv(idx: number) {
    if (!envKey.trim()) return;
    const s = servers[idx];
    update(idx, { env: { ...s.env, [envKey.trim()]: envVal } });
    setEnvKey("");
    setEnvVal("");
  }

  function removeEnv(idx: number, key: string) {
    const s = servers[idx];
    const next = { ...s.env };
    delete next[key];
    update(idx, { env: next });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-600">MCP Servers</label>
        <button
          type="button"
          onClick={add}
          className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer"
        >
          + Add Server
        </button>
      </div>

      {servers.length === 0 && (
        <p className="text-xs text-gray-400 italic">No MCP servers configured</p>
      )}

      {servers.map((server, idx) => (
        <div key={idx} className="rounded-[var(--radius-sm)] border border-gray-200 bg-gray-50 p-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
              className="flex-1 text-left text-xs font-medium text-gray-700 cursor-pointer"
            >
              {server.name || "(unnamed)"} — {server.command || "(no command)"}
            </button>
            <button
              type="button"
              onClick={() => remove(idx)}
              className="ml-2 text-xs text-red-500 hover:text-red-700 cursor-pointer"
            >
              Remove
            </button>
          </div>

          {expandedIdx === idx && (
            <div className="mt-2 space-y-2">
              <input
                type="text"
                value={server.name}
                onChange={(e) => update(idx, { name: e.target.value })}
                placeholder="server-name (lowercase, hyphens)"
                className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
              <input
                type="text"
                value={server.command}
                onChange={(e) => update(idx, { command: e.target.value })}
                placeholder="Command (e.g. npx, uvx, /path/to/binary)"
                className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
              <div>
                <label className="text-[10px] text-gray-500">Args (space-separated)</label>
                <input
                  type="text"
                  value={argsInput[idx] ?? server.args.join(" ")}
                  onChange={(e) => {
                    setArgsInput({ ...argsInput, [idx]: e.target.value });
                  }}
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    update(idx, { args: val ? val.split(/\s+/) : [] });
                  }}
                  placeholder="--flag value"
                  className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500">Environment Variables</label>
                {Object.entries(server.env).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] font-mono text-gray-600">{k}={v}</span>
                    <button
                      type="button"
                      onClick={() => removeEnv(idx, k)}
                      className="text-[10px] text-red-400 hover:text-red-600 cursor-pointer"
                    >
                      x
                    </button>
                  </div>
                ))}
                <div className="flex gap-1 mt-1">
                  <input
                    type="text"
                    value={envKey}
                    onChange={(e) => setEnvKey(e.target.value)}
                    placeholder="KEY"
                    className="w-24 rounded border border-gray-300 bg-white px-1 py-0.5 text-[10px] text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={envVal}
                    onChange={(e) => setEnvVal(e.target.value)}
                    placeholder="value"
                    className="flex-1 rounded border border-gray-300 bg-white px-1 py-0.5 text-[10px] text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => addEnv(idx)}
                    className="text-[10px] text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
