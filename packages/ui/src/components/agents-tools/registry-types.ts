export interface RegistryServer {
  server: {
    name: string;
    description: string;
    title?: string;
    version: string;
    repository?: { url: string; source: string };
    packages?: RegistryPackage[];
    remotes?: Array<{ type: string; url: string }>;
  };
  _meta: {
    "io.modelcontextprotocol.registry/official": {
      status: string;
      publishedAt: string;
      updatedAt: string;
      isLatest: boolean;
    };
  };
}

export interface RegistryPackage {
  registryType: "npm" | "pypi" | "nuget" | "oci";
  identifier: string;
  version?: string;
  runtimeHint?: string;
  transport: { type: "stdio" | "sse" | "streamable-http"; url?: string };
  runtimeArguments?: Array<{ value: string; type: string }>;
  packageArguments?: Array<{
    name?: string;
    value?: string;
    type: string;
    description?: string;
    isRequired?: boolean;
    default?: string;
  }>;
  environmentVariables?: Array<{
    name: string;
    description?: string;
    isRequired?: boolean;
    isSecret?: boolean;
    default?: string;
  }>;
}

export interface RegistryListResponse {
  servers: RegistryServer[];
  metadata: { nextCursor: string | null; count?: number };
}
