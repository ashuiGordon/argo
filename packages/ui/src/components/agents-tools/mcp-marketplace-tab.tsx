import { useState, useEffect, useCallback, useRef } from "react";
import { featuredMcpServers, type FeaturedMcpServer } from "../../data/curated-mcp-servers";
import type { RegistryServer, RegistryListResponse, RegistryPackage } from "./registry-types";
import { api } from "../../services/api-client";
import { getAgentLogo, getAgentAvatar } from "../../lib/agent-logos";

interface AgentOption {
  id: string;
  name: string;
  type: string;
  avatarColor: string;
  role?: string;
  config?: {
    mcpServers?: Array<{ name: string; command: string; args?: string[]; env?: Record<string, string> }>;
  };
}

const CATEGORIES = ["all", "filesystem", "git", "database", "cloud", "web", "dev-tools", "ai", "communication"] as const;

export function McpMarketplaceTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [registryResults, setRegistryResults] = useState<RegistryServer[]>([]);
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [installTarget, setInstallTarget] = useState<{ server: FeaturedMcpServer | null; registry: RegistryServer | null } | null>(null);
  const [envInputs, setEnvInputs] = useState<Record<string, string>>({});
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    api.agents.list().then((res) => setAgents(res.agents as AgentOption[]));
  }, []);

  const searchRegistry = useCallback(async (query: string) => {
    if (!query.trim()) {
      setRegistryResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/mcp-registry/v0/servers?search=${encodeURIComponent(query)}&limit=20`);
      if (res.ok) {
        const data: RegistryListResponse = await res.json();
        const stdio = data.servers.filter(
          (s) => s.server.packages?.some((p) => p.transport.type === "stdio")
        );
        setRegistryResults(stdio);
      }
    } catch {
      // registry unreachable
    } finally {
      setLoading(false);
    }
  }, []);

  function handleSearchInput(value: string) {
    setSearchQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchRegistry(value), 400);
  }

  function convertRegistryToMcp(server: RegistryServer): { name: string; command: string; args: string[]; env: Record<string, string> } | null {
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
      env[v.name] = envInputs[v.name] || v.default || "";
    });

    return { name, command, args, env };
  }

  async function handleInstall(agentId: string) {
    if (!installTarget) return;

    let mcpEntry: { name: string; command: string; args: string[]; env: Record<string, string> } | null = null;

    if (installTarget.server) {
      mcpEntry = {
        name: installTarget.server.name,
        command: installTarget.server.command,
        args: [...installTarget.server.args],
        env: { ...installTarget.server.env, ...envInputs },
      };
    } else if (installTarget.registry) {
      mcpEntry = convertRegistryToMcp(installTarget.registry);
    }

    if (!mcpEntry) return;

    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;

    const existing = agent.config?.mcpServers || [];
    const updated = [...existing, mcpEntry];

    await api.agents.update(agentId, { config: { mcpServers: updated } } as never);
    const res = await api.agents.list();
    setAgents(res.agents as AgentOption[]);
    setInstallTarget(null);
    setEnvInputs({});
  }

  const filteredFeatured = category === "all"
    ? featuredMcpServers
    : featuredMcpServers.filter((s) => s.category === category);

  const showFeatured = !searchQuery.trim();

  function isInstalled(serverName: string) {
    return agents.some((a) => a.config?.mcpServers?.some((m) => m.name === serverName));
  }

  return (
    <div className="p-6">
      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="Search MCP servers from registry..."
            className="w-full rounded-[var(--radius-md)] border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-[13px] text-gray-900 placeholder-gray-400 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
          />
        </div>
      </div>

      {/* Category chips */}
      {showFeatured && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`rounded-[var(--radius-pill)] px-3 py-1 text-[11px] font-500 transition-colors cursor-pointer ${
                category === cat
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat === "all" ? "All" : cat.replace("-", " ")}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="py-8 text-center text-[13px] text-gray-400">
          Searching registry...
        </div>
      )}

      {/* Registry results */}
      {!showFeatured && !loading && (
        <div className="space-y-2">
          {registryResults.length === 0 && searchQuery.trim() && (
            <p className="py-8 text-center text-[13px] text-gray-400">
              No stdio MCP servers found for "{searchQuery}"
            </p>
          )}
          {registryResults.map((entry) => (
            <RegistryServerCard
              key={`${entry.server.name}-${entry.server.version}`}
              entry={entry}
              installed={isInstalled(entry.server.name.split("/").pop() || entry.server.name)}
              onInstall={() => {
                setInstallTarget({ server: null, registry: entry });
                setEnvInputs({});
              }}
            />
          ))}
        </div>
      )}

      {/* Featured servers */}
      {showFeatured && (
        <div className="grid gap-2">
          {filteredFeatured.map((server) => (
            <FeaturedServerCard
              key={server.id}
              server={server}
              installed={isInstalled(server.name)}
              onInstall={() => {
                setInstallTarget({ server, registry: null });
                setEnvInputs({});
              }}
            />
          ))}
        </div>
      )}

      {/* Install modal */}
      {installTarget && (
        <InstallModal
          serverName={installTarget.server?.name || installTarget.registry?.server.name || ""}
          envVars={getEnvVars(installTarget)}
          envInputs={envInputs}
          onEnvChange={(k, v) => setEnvInputs((prev) => ({ ...prev, [k]: v }))}
          agents={agents}
          onInstall={handleInstall}
          onClose={() => { setInstallTarget(null); setEnvInputs({}); }}
        />
      )}
    </div>
  );
}

function getEnvVars(target: { server: FeaturedMcpServer | null; registry: RegistryServer | null }): Array<{ name: string; description?: string; isRequired?: boolean }> {
  if (target.server) {
    return Object.keys(target.server.env).map((k) => ({ name: k, isRequired: true }));
  }
  if (target.registry) {
    const pkg = target.registry.server.packages?.find((p) => p.transport.type === "stdio");
    return pkg?.environmentVariables || [];
  }
  return [];
}

function FeaturedServerCard({ server, installed, onInstall }: { server: FeaturedMcpServer; installed: boolean; onInstall: () => void }) {
  return (
    <div className="flex items-center gap-4 rounded-[var(--radius-md)] border border-gray-200 px-4 py-3 transition-colors hover:bg-gray-50">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-br from-gray-100 to-gray-50 text-gray-500">
        <ServerIcon category={server.category} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-500 text-gray-900">{server.name}</span>
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">{server.category}</span>
        </div>
        <p className="mt-0.5 text-[12px] text-gray-500 truncate">{server.description}</p>
      </div>
      {installed ? (
        <span className="shrink-0 rounded-[var(--radius-pill)] bg-green-50 px-2.5 py-1 text-[11px] font-500 text-green-600">
          Installed
        </span>
      ) : (
        <button
          onClick={onInstall}
          className="shrink-0 rounded-[var(--radius-pill)] border border-gray-200 px-3 py-1 text-[11px] font-500 text-gray-700 transition-colors hover:bg-gray-100 cursor-pointer"
        >
          Install
        </button>
      )}
    </div>
  );
}

function RegistryServerCard({ entry, installed, onInstall }: { entry: RegistryServer; installed: boolean; onInstall: () => void }) {
  const name = entry.server.title || entry.server.name.split("/").pop() || entry.server.name;
  const pkg = entry.server.packages?.find((p) => p.transport.type === "stdio");

  return (
    <div className="flex items-center gap-4 rounded-[var(--radius-md)] border border-gray-200 px-4 py-3 transition-colors hover:bg-gray-50">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-500">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-500 text-gray-900">{name}</span>
          {pkg && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
              {pkg.registryType}
            </span>
          )}
          <span className="text-[10px] text-gray-400">v{entry.server.version}</span>
        </div>
        <p className="mt-0.5 text-[12px] text-gray-500 truncate">{entry.server.description}</p>
      </div>
      {installed ? (
        <span className="shrink-0 rounded-[var(--radius-pill)] bg-green-50 px-2.5 py-1 text-[11px] font-500 text-green-600">
          Installed
        </span>
      ) : (
        <button
          onClick={onInstall}
          className="shrink-0 rounded-[var(--radius-pill)] border border-gray-200 px-3 py-1 text-[11px] font-500 text-gray-700 transition-colors hover:bg-gray-100 cursor-pointer"
        >
          Install
        </button>
      )}
    </div>
  );
}

function InstallModal({
  serverName,
  envVars,
  envInputs,
  onEnvChange,
  agents,
  onInstall,
  onClose,
}: {
  serverName: string;
  envVars: Array<{ name: string; description?: string; isRequired?: boolean }>;
  envInputs: Record<string, string>;
  onEnvChange: (key: string, value: string) => void;
  agents: AgentOption[];
  onInstall: (agentId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-[var(--radius-lg)] border border-gray-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 text-[15px] font-500 text-gray-900">
          Install "{serverName}"
        </h3>
        <p className="mb-4 text-[12px] text-gray-500">
          Choose which agent to add this MCP server to
        </p>

        {/* Env var inputs */}
        {envVars.length > 0 && (
          <div className="mb-4 space-y-2">
            <label className="text-[11px] font-500 text-gray-600">Environment Variables</label>
            {envVars.map((v) => (
              <div key={v.name}>
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-[11px] font-mono text-gray-700">{v.name}</span>
                  {v.isRequired && <span className="text-[10px] text-red-400">*</span>}
                </div>
                {v.description && (
                  <p className="text-[10px] text-gray-400 mb-0.5">{v.description}</p>
                )}
                <input
                  type={v.name.toLowerCase().includes("key") || v.name.toLowerCase().includes("secret") || v.name.toLowerCase().includes("token") ? "password" : "text"}
                  value={envInputs[v.name] || ""}
                  onChange={(e) => onEnvChange(v.name, e.target.value)}
                  placeholder={`Enter ${v.name}`}
                  className="w-full rounded border border-gray-200 bg-white px-2.5 py-1.5 text-[12px] text-gray-900 placeholder-gray-400 focus:border-gray-300 focus:outline-none"
                />
              </div>
            ))}
          </div>
        )}

        {/* Agent list */}
        <div className="space-y-1.5">
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => onInstall(agent.id)}
              className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] border border-gray-200 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 cursor-pointer"
            >
              {(() => {
                const logo = getAgentAvatar(agent.role) || getAgentLogo(agent.type);
                return logo ? (
                  <img src={logo} alt="" className="h-6 w-6 rounded-full" />
                ) : (
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: agent.avatarColor }}
                  >
                    {agent.name[0]}
                  </div>
                );
              })()}
              <span className="text-[13px] font-500 text-gray-900">{agent.name}</span>
              <span className="ml-auto text-[11px] text-gray-400">{agent.type}</span>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-[var(--radius-sm)] border border-gray-200 py-2 text-[12px] text-gray-600 transition-colors hover:bg-gray-50 cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ServerIcon({ category }: { category: string }) {
  switch (category) {
    case "filesystem":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
      );
    case "git":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
        </svg>
      );
    case "database":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
        </svg>
      );
    case "cloud":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
        </svg>
      );
    case "web":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
      );
    case "ai":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
      );
    case "communication":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      );
    default:
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
        </svg>
      );
  }
}
