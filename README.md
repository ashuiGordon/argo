# Argo

A local-first multi-agent programming collaboration platform. Argo wraps AI coding CLI tools (Claude Code, Codex) as visual agents and provides a unified interface to orchestrate them working together on your local projects.

## What is Argo?

Unlike traditional AI coding assistants that call LLM APIs directly, Argo runs Claude Code CLI / Codex CLI as subprocess agents via SDK async generators. Each agent inherits the full CLI capabilities (file operations, command execution, code search) while Argo adds visualization, team orchestration, and safety controls on top.

**Core capabilities:**

- **Visual Conversations** — Streaming display of agent thinking, tool calls, and artifacts, replacing the raw terminal experience
- **Multi-Agent Teams** — 8 specialized built-in agents + custom agents, auto-orchestrated by a Moderator with parallel execution + git worktree branch isolation
- **Safety Approvals** — 4-level risk classification (Low/Medium/High/Critical), real-time approval cards for dangerous operations, 30s auto-deny timeout
- **Context Memory** — Auto session summaries + message pinning + context injection for cross-session continuity
- **One-Click Deploy** — Code generated in conversations can be previewed locally, deployed to Vercel/Netlify/Docker/Fly.io, or packaged for download
- **MCP Extensions** — Extend agent capabilities via Model Context Protocol servers (GitHub, databases, search, browser, etc.)

## Architecture

```
Frontend (localhost:5173)
    │  React 18 + Vite + Zustand + TailwindCSS
    │
    ▼  WebSocket + REST
Daemon (localhost:54321)
    │  Hono + Node.js + SQLite (WAL)
    │
    ▼  Claude Code SDK / Codex SDK
Agent CLI Subprocesses
```

All data stored locally in SQLite. No cloud dependency.

## Built-in Agents

| Agent | Role | Model | Permissions |
|-------|------|-------|-------------|
| **Architect** | Code analysis, bug diagnosis, architecture suggestions | Opus | Read-only |
| **Planner** | Requirements analysis, task decomposition, work planning | Opus | Read-only |
| **Executor** | Code implementation with minimal diffs | Sonnet | Full |
| **Reviewer** | Spec compliance, security, code quality review | Opus | Read-only |
| **Debugger** | Systematic bug investigation and fixes | Sonnet | Full |
| **Tester** | Comprehensive test writing (happy path + edge cases) | Sonnet | Full |
| **Designer** | UI/UX implementation, responsive design, accessibility | Sonnet | Full |
| **Ops** | Git operations, branch management, CI/CD, deployments | Sonnet | Full |

## Team Collaboration

When multiple agents are assigned to a conversation:

1. User sends a message
2. Moderator analyzes the task and @mentions the needed agents
3. Agents run in parallel (up to 5 concurrent), each in isolated git worktrees
4. Results are merged and synthesized into a unified response
5. Up to 3 rounds of agent collaboration per user message

**Team Presets:**
- **Auto** — Moderator has full autonomy to decide which agents to invoke
- **Feature** — Structured pipeline: Clarify → Plan → Implement → Test → Review → Commit

## Prerequisites

- Node.js >= 22.0.0
- pnpm >= 9
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) (authenticated via OAuth)
- Git (required for multi-agent parallel worktrees)
- Codex CLI (optional alternative runtime)

## Getting Started

```bash
# Clone the repository
git clone https://github.com/ashuiGordon/argo.git
cd argo

# Install dependencies
pnpm install

# Start development servers (daemon + UI)
pnpm dev
```

Once running:
- UI: http://localhost:5173
- Daemon API: http://localhost:54321
- WebSocket: ws://localhost:54321/ws

On first visit, a development user is auto-created — no registration needed.

## Project Structure

```
packages/
  shared/     # Shared types, schemas, constants
  daemon/     # Backend: API routes, orchestrator, session management,
              # approval system, event bus, memory, deploy manager
  ui/         # Frontend: React SPA with chat, workspace panel,
              # agent management, approval cards, deploy UI
avatars/      # Agent avatar images
```

## Scripts

```bash
pnpm dev        # Start daemon + UI in development mode
pnpm build      # Build all packages for production
pnpm test       # Run tests
pnpm typecheck  # TypeScript type checking
pnpm lint       # ESLint
pnpm format     # Prettier formatting
```

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `ANTHROPIC_API_KEY` | Session summary generation (Claude API) | Optional* |

\* Agent execution itself doesn't need this — Claude Code CLI manages its own authentication. Without the key, summaries fall back to a local extraction method.

## Key Features

### MCP Server Integration

Agents can be extended with MCP (Model Context Protocol) servers for additional capabilities:
- 13 pre-configured servers (filesystem, git, github, postgres, sqlite, brave-search, puppeteer, slack, memory, fetch, etc.)
- Install from MCP Marketplace or search the MCP Registry
- Up to 20 MCP servers per agent

### Skills System

Reusable prompt templates injected into agent system prompts:
- 10 built-in general skills (code-review, write-tests, refactor, debug, etc.)
- 4 deployment skills (preview, static, container, package)
- Up to 50 skills per agent, max 10,000 characters each

### Approval System

All agent tool calls flow through a risk classifier:
- **Auto-allow (Low):** Read, Glob, Grep, WebSearch, etc.
- **Medium:** File writes/edits, general Bash commands
- **High:** Operations on sensitive files (.env, credentials)
- **Critical:** `rm -rf`, `DROP TABLE`, `git push --force`, etc.

"Always Allow" rules can be configured per user to streamline repeated safe operations.

### Deployment

Four deployment types available from within conversations:
- **Preview** — Local dev server with framework auto-detection
- **Static** — Deploy to Vercel or Netlify
- **Container** — Docker build + Fly.io deployment
- **Package** — Download as tar/zip archive

## License

Private
