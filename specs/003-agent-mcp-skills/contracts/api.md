# API Contract: Agent MCP and Skill Configuration

## Extended Agent Payload

The agent object in all API responses is extended:

```json
{
  "id": "uuid",
  "name": "My Agent",
  "type": "claude_code",
  "avatarColor": "#1863dc",
  "systemPrompt": "You are a helpful assistant",
  "capabilities": ["code", "analysis"],
  "config": {
    "mcpServers": [
      {
        "name": "filesystem",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
        "env": {}
      }
    ],
    "skills": [
      {
        "name": "deploy",
        "description": "Deploy current branch",
        "prompt": "Run ./scripts/deploy.sh --staging"
      }
    ]
  },
  "createdAt": "2026-05-25T00:00:00Z"
}
```

## POST /api/agents — Create Agent (extended)

**Request body** (additions to existing schema):

```json
{
  "name": "My Agent",
  "avatarColor": "#1863dc",
  "systemPrompt": "You are helpful",
  "capabilities": ["code"],
  "config": {
    "mcpServers": [
      { "name": "fs", "command": "npx", "args": ["-y", "@mcp/server-fs", "/tmp"], "env": {} }
    ],
    "skills": [
      { "name": "deploy", "description": "Deploy branch", "prompt": "Run deploy..." }
    ]
  }
}
```

**Validation errors** (HTTP 400):

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid MCP server configuration",
    "details": [
      { "field": "config.mcpServers[0].name", "issue": "Duplicate server name" },
      { "field": "config.skills[0].name", "issue": "Reserved skill name 'help'" }
    ]
  }
}
```

## PUT /api/agents/:id — Update Agent (extended)

Same `config` structure as create. Replaces the entire config on update (not a patch).

## Validation Rules (Server-Side)

| Rule | Error Message |
|------|---------------|
| MCP server name duplicate | "Duplicate MCP server name: {name}" |
| MCP server name invalid format | "MCP server name must be lowercase alphanumeric with hyphens" |
| MCP server command empty | "MCP server command is required" |
| Skill name duplicate | "Duplicate skill name: {name}" |
| Skill name reserved | "Skill name '{name}' is reserved" |
| Skill name invalid format | "Skill name must be lowercase alphanumeric with hyphens" |
| Skill prompt too long | "Skill prompt exceeds 10000 character limit" |

## Settings JSON Output (Claude Code)

When launching a Claude Code session, the generated settings JSON includes:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
      "env": {}
    }
  },
  "hooks": {
    "PreToolUse": [...],
    "PostToolUse": [...]
  }
}
```

Note: The `mcpServers` in settings uses an object keyed by name (Claude Code's native format), while the storage format uses an array (easier for UI manipulation).
