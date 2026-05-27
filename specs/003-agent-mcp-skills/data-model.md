# Data Model: Agent MCP and Skill Configuration

## Entities

### McpServerConfig

Represents a configured MCP server for an agent.

| Field   | Type              | Constraints                         |
|---------|-------------------|-------------------------------------|
| name    | string            | Required, unique per agent, 1-64 chars, lowercase alphanumeric + hyphens |
| command | string            | Required, 1-500 chars               |
| args    | string[]          | Optional, max 50 entries, each max 1000 chars |
| env     | Record<string, string> | Optional, max 20 entries, keys max 100 chars, values max 1000 chars |

**Validation Rules**:
- `name` must match pattern `^[a-z0-9][a-z0-9-]*$`
- `name` must be unique within the same agent's MCP server list
- `command` must not be empty
- Total serialized size of all MCP servers for one agent must not exceed 100KB

### SkillConfig

Represents a custom skill/slash command for an agent.

| Field       | Type   | Constraints                                      |
|-------------|--------|--------------------------------------------------|
| name        | string | Required, unique per agent, 1-32 chars, lowercase alphanumeric + hyphens |
| description | string | Required, 1-200 chars                            |
| prompt      | string | Required, 1-10000 chars                          |

**Validation Rules**:
- `name` must match pattern `^[a-z0-9][a-z0-9-]*$`
- `name` must not be a reserved/built-in skill name (see research.md R4)
- `name` must be unique within the same agent's skill list
- `prompt` maximum length: 10,000 characters

### Agent (extended)

The existing Agent entity gains two collections within its `config` JSON:

| Field                | Type              | Storage                        |
|----------------------|-------------------|--------------------------------|
| config.mcpServers    | McpServerConfig[] | JSON array in config column    |
| config.skills        | SkillConfig[]     | JSON array in config column    |

No database schema migration required — uses existing `config TEXT` column.

## Relationships

```
Agent 1 ──── * McpServerConfig  (embedded in config JSON)
Agent 1 ──── * SkillConfig      (embedded in config JSON)
```

## Storage Format (SQLite `agents.config` column)

```json
{
  "mcpServers": [
    {
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/projects"],
      "env": {}
    },
    {
      "name": "github",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "ghp_..." }
    }
  ],
  "skills": [
    {
      "name": "deploy",
      "description": "Deploy the current branch to staging",
      "prompt": "Run the deployment pipeline for the current branch. Use the deploy script at ./scripts/deploy.sh with the --staging flag. Report the deployment status when complete."
    }
  ]
}
```
