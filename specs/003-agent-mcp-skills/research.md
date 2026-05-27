# Research: Agent MCP and Skill Configuration

## R1: How Claude Code Accepts MCP Server Configuration

**Decision**: Use the `mcpServers` key in the settings JSON file passed via `--settings`.

**Rationale**: Claude Code's settings JSON supports a top-level `mcpServers` object where each key is the server name and the value contains `command`, `args`, and `env`. This is the same format as `.claude/settings.json` or `.mcp.json`. Since we already generate a per-session settings JSON file (for hook relay), we simply add the `mcpServers` section to it. This is the official, documented mechanism.

**Format**:
```json
{
  "mcpServers": {
    "server-name": {
      "command": "/path/to/binary",
      "args": ["arg1", "arg2"],
      "env": { "KEY": "value" }
    }
  },
  "hooks": { ... }
}
```

**Alternatives considered**:
- `--mcp-config <path>`: Separate JSON file; adds complexity for no benefit since we already use `--settings`.
- CLI `--mcp` flag: Does not exist in current Claude Code CLI.

## R2: How Claude Code Accepts Custom Skills

**Decision**: Inject skills into the system prompt via `--append-system-prompt` flag or include them in the `--system-prompt` content.

**Rationale**: Claude Code does not have a native "skills" registration mechanism via CLI flags. Skills in Claude Code are typically defined as project-level commands in `.claude/commands/` directory or via settings. For Argo-managed agents, the cleanest approach is to append skill definitions to the system prompt as structured instructions that Claude will recognize as available slash commands. The `--append-system-prompt` flag concatenates additional text after the main system prompt.

**Skill injection format** (appended to system prompt):
```
## Available Skills

### /skill-name
Description: <description>

<prompt body>
```

**Alternatives considered**:
- Writing `.claude/commands/*.md` files to workspace: Pollutes user workspace, requires cleanup, fragile.
- Settings JSON `skills` key: Not a supported field in Claude Code settings.
- Custom CLAUDE.md injection: Requires file system write to workspace, race conditions with user's own CLAUDE.md.

## R3: How Codex Accepts MCP Configuration

**Decision**: Pass MCP server configuration in the `initialize` JSON-RPC parameters.

**Rationale**: Codex's app-server protocol accepts configuration during the `initialize` handshake. The `mcpServers` configuration can be passed as part of the initialization params. If Codex doesn't support MCP natively, the fallback is to inject tool descriptions into the system prompt (same as skills).

**Alternatives considered**:
- Environment variables: Not documented for MCP.
- CLI flags on `codex app-server`: No `--mcp` flag available.

## R4: Validation of Reserved Skill Names

**Decision**: Maintain a hardcoded list of reserved names that map to Claude Code's built-in slash commands.

**Reserved names**: `help`, `clear`, `compact`, `config`, `cost`, `doctor`, `init`, `login`, `logout`, `mcp`, `memory`, `model`, `permissions`, `review`, `status`, `terminal`, `vim`, `fast`.

**Rationale**: These are Claude Code's built-in slash commands. Allowing users to create skills with these names would create confusion and potential conflicts.

## R5: Storage Strategy

**Decision**: Store MCP and skill configs in the existing `config` JSON column of the agents table.

**Rationale**: The agent table already has a `config TEXT` column that stores arbitrary JSON. Adding `mcpServers` and `skills` arrays to this JSON avoids schema migrations and keeps the implementation simple. The data is always read as a whole agent record anyway.

**Schema within config JSON**:
```json
{
  "mcpServers": [
    { "name": "fs", "command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"], "env": {} }
  ],
  "skills": [
    { "name": "deploy", "description": "Deploy current branch", "prompt": "Run the deploy pipeline..." }
  ]
}
```

**Alternatives considered**:
- Separate tables (agent_mcp_servers, agent_skills): Overkill for JSON data that's always loaded together.
- Separate JSON columns: No benefit over a single config object.
