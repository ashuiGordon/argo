import { useState, useRef } from "react";
import { featuredMcpServers } from "../../data/curated-mcp-servers";
import type { RegistryServer, RegistryListResponse } from "../agents-tools/registry-types";

export interface McpServerEntry {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
}

interface McpServerPickerProps {
  servers: McpServerEntry[];
  onChange: (servers: McpServerEntry[]) => void;
}

const CATEGORIES = ["all", "filesystem", "git", "database", "cloud", "web", "dev-tools", "ai", "communication"] as const;

export function McpServerPicker({ servers, onChange }: McpServerPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [registryResults, setRegistryResults] = useState<RegistryServer[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  function handleSearchInput(value: string) {
    setSearchQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!value.trim()) {
      setRegistryResults([]);
      return;
    }
    searchTimeout.current = setTimeout(() => searchRegistry(value), 400);
  }

  async function searchRegistry(query: string) {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/mcp-registry/v0/servers?search=${encodeURIComponent(query)}&limit=20`);
      if (res.ok) {
        const data: RegistryListResponse = await res.json();
        setRegistryResults(data.servers || []);
      }
    } catch { /* ignore */ }
    setSearching(false);
  }

  function convertRegistryToMcp(server: RegistryServer): McpServerEntry | null {
    const pkg = server.server.packages?.find((p) => p.transport.type === "stdio");
    if (!pkg) return null;

    const name = server.server.name.split("/").pop() || server.server.name;
    let command = pkg.runtimeHint || "npx";
    const args: string[] = [];

    if (pkg.runtimeHint === "npx" || pkg.registryType === "npm") {
      command = "npx";
      const runtimeArgs = pkg.runtimeArguments?.map((a) => a.value) || ["-y"];
      args.push(...runtimeArgs, pkg.identifier);
    } else if (pkg.runtimeHint === "uvx" || pkg.registryType === "pypi") {
      command = "uvx";
      args.push(pkg.identifier);
    } else if (pkg.runtimeHint === "docker" || pkg.registryType === "oci") {
      command = "docker";
      args.push("run", "-i", "--rm", pkg.identifier);
    } else {
      args.push(pkg.identifier);
    }

    const env: Record<string, string> = {};
    pkg.environmentVariables?.forEach((v) => {
      env[v.name] = v.default || "";
    });

    return { name, command, args, env };
  }

  function addFeatured(server: typeof featuredMcpServers[0]) {
    if (servers.some((s) => s.name === server.name)) return;
    onChange([...servers, { name: server.name, command: server.command, args: [...server.args], env: { ...server.env } }]);
  }

  function addFromRegistry(registryServer: RegistryServer) {
    const entry = convertRegistryToMcp(registryServer);
    if (!entry) return;
    if (servers.some((s) => s.name === entry.name)) return;
    onChange([...servers, entry]);
  }

  function remove(idx: number) {
    onChange(servers.filter((_, i) => i !== idx));
  }

  function updateEnv(idx: number, key: string, value: string) {
    onChange(servers.map((s, i) => i === idx ? { ...s, env: { ...s.env, [key]: value } } : s));
  }

  const filteredFeatured = category === "all"
    ? featuredMcpServers
    : featuredMcpServers.filter((s) => s.category === category);

  const hasEnvVars = (s: McpServerEntry) => Object.keys(s.env).length > 0;

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-gray-600">MCP Servers</label>

      {/* Added servers */}
      {servers.length > 0 && (
        <div className="space-y-2">
          {servers.map((server, idx) => (
            <div key={idx} className="rounded-[var(--radius-sm)] border border-gray-200 bg-white px-3 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-50 text-blue-500">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14" />
                    </svg>
                  </span>
                  <span className="text-[12px] font-500 text-gray-900">{server.name}</span>
                  <span className="text-[10px] font-mono text-gray-400">{server.command}</span>
                </div>
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="text-[11px] text-gray-400 hover:text-red-500 cursor-pointer"
                >
                  Remove
                </button>
              </div>
              {hasEnvVars(server) && (
                <div className="mt-2 space-y-1 border-t border-gray-100 pt-2">
                  {Object.entries(server.env).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-2">
                      <label className="w-40 truncate text-[10px] font-mono text-gray-500">{key}</label>
                      <input
                        type={key.toLowerCase().includes("key") || key.toLowerCase().includes("secret") || key.toLowerCase().includes("token") ? "password" : "text"}
                        value={val}
                        onChange={(e) => updateEnv(idx, key, e.target.value)}
                        placeholder="(required)"
                        className="flex-1 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-900 placeholder-gray-300 focus:border-blue-400 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Browser */}
      <div className="rounded-[var(--radius-md)] border border-gray-200 bg-gray-50 p-3">
        {/* Search */}
        <div className="relative mb-2.5">
          <svg className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="Search MCP servers..."
            className="w-full rounded-[var(--radius-sm)] border border-gray-200 bg-white pl-8 pr-3 py-1.5 text-[12px] text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none"
          />
          {searching && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
            </div>
          )}
        </div>

        {/* Category chips */}
        {!searchQuery && (
          <div className="mb-2.5 flex flex-wrap gap-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-[var(--radius-pill)] px-2 py-0.5 text-[10px] font-500 transition-colors cursor-pointer ${
                  category === cat
                    ? "bg-gray-900 text-white"
                    : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-100"
                }`}
              >
                {cat === "all" ? "All" : cat}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        <div className="max-h-[200px] space-y-1 overflow-y-auto">
          {searchQuery ? (
            registryResults.length > 0 ? (
              registryResults.map((rs) => {
                const name = rs.server.name.split("/").pop() || rs.server.name;
                const isAdded = servers.some((s) => s.name === name);
                return (
                  <div
                    key={rs.server.name}
                    className={`flex items-center gap-2.5 rounded-[var(--radius-sm)] border border-gray-200 bg-white px-2.5 py-2 ${isAdded ? "opacity-50" : ""}`}
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-indigo-50 text-indigo-500">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-500 text-gray-900 truncate">{name}</div>
                      <div className="text-[10px] text-gray-400 truncate">{rs.server.description}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => addFromRegistry(rs)}
                      disabled={isAdded}
                      className={`shrink-0 rounded-[var(--radius-pill)] px-2 py-0.5 text-[10px] font-500 cursor-pointer ${
                        isAdded
                          ? "bg-green-50 text-green-500"
                          : "border border-gray-200 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {isAdded ? "Added" : "+ Add"}
                    </button>
                  </div>
                );
              })
            ) : searching ? null : (
              <p className="py-3 text-center text-[11px] text-gray-400">No servers found</p>
            )
          ) : (
            filteredFeatured.map((server) => {
              const isAdded = servers.some((s) => s.name === server.name);
              return (
                <div
                  key={server.id}
                  className={`flex items-center gap-2.5 rounded-[var(--radius-sm)] border border-gray-200 bg-white px-2.5 py-2 ${isAdded ? "opacity-50" : ""}`}
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-blue-50 text-blue-500">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-500 text-gray-900 truncate">{server.name}</div>
                    <div className="text-[10px] text-gray-400 truncate">{server.description}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => addFeatured(server)}
                    disabled={isAdded}
                    className={`shrink-0 rounded-[var(--radius-pill)] px-2 py-0.5 text-[10px] font-500 cursor-pointer ${
                      isAdded
                        ? "bg-green-50 text-green-500"
                        : "border border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {isAdded ? "Added" : "+ Add"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
