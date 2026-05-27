# Implementation Plan: Agent MCP and Skill Configuration

**Branch**: `003-agent-mcp-skills` | **Date**: 2026-05-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-agent-mcp-skills/spec.md`

## Summary

Enable per-agent configuration of MCP servers and custom skills. MCP server definitions (name, command, args, env) and skill definitions (name, description, prompt) are stored in the agent's existing `config` JSON column. On launch, the Claude Code adapter injects MCP servers into the settings JSON file and skills into the system prompt or `--append-system-prompt`. Codex adapter passes MCP/skill config through its app-server initialization. The UI agent form is extended with collapsible sections for managing MCP servers and skills.

## Technical Context

**Language/Version**: TypeScript 5.x (Node 20+, React 18)

**Primary Dependencies**: Hono (API), better-sqlite3 (DB), Zustand (UI state), Tailwind CSS (UI styling), node-pty (PTY mode)

**Storage**: SQLite via better-sqlite3 — agent `config` JSON column already exists

**Testing**: vitest (unit), dev-browser (UI verification)

**Target Platform**: macOS/Linux daemon + web browser UI

**Project Type**: Web service (daemon) + SPA (UI)

**Performance Goals**: Agent launch time increase <500ms with 5 MCP servers configured

**Constraints**: Settings JSON must be written atomically before process spawn; skill prompt bodies max 10KB

**Scale/Scope**: Single-user platform, <50 agents, <20 MCP servers per agent

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Native CLI Fidelity | ✅ PASS | MCP servers passed via native `--settings` mechanism; no capability downgrade |
| II. Dual-Mode Architecture | ✅ PASS | MCP config applies to both headless and PTY modes (settings file is mode-independent) |
| III. Approval Sovereignty | ✅ PASS | MCP server tools still go through approval flow (PreToolUse hooks remain active) |
| IV. Session Continuity | ✅ PASS | MCP servers persist for session lifetime; no process restart needed |
| V. Complete Hook Coverage | ✅ PASS | Hook relay remains unchanged; MCP tool calls emit PreToolUse/PostToolUse events |
| VI. Observability by Default | ✅ PASS | MCP tool invocations produce NormalizedEvents via existing parser |

All gates pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/003-agent-mcp-skills/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.md           # API contract additions
└── tasks.md             # Phase 2 output (via /speckit-tasks)
```

### Source Code (repository root)

```text
packages/shared/src/
├── types/index.ts           # Extended Agent interface (McpServerConfig, SkillConfig)
└── schemas/api.ts           # Extended CreateAgentRequest/UpdateAgentRequest

packages/daemon/src/
├── adapters/claude/
│   ├── hook-relay.ts        # Extended: inject mcpServers into settings JSON
│   └── launcher.ts          # Extended: pass skills via --append-system-prompt
├── adapters/codex/
│   └── adapter.ts           # Extended: pass MCP/skills in initialize params
├── api/agents.ts            # Existing CRUD (no changes needed — uses config JSON)
└── db/
    └── queries.ts           # No schema change needed (config column is JSON)

packages/ui/src/
├── components/agents/
│   ├── agent-form.tsx       # Extended: MCP and Skills sections
│   ├── mcp-server-form.tsx  # New: MCP server entry form
│   └── skill-form.tsx       # New: Skill entry form
└── services/api-client.ts   # No change (agent CRUD already exists)
```

**Structure Decision**: Extends existing monorepo packages (shared, daemon, ui). No new packages needed. MCP/skill config stored within the agent's existing `config` JSON column (keyed as `config.mcpServers` and `config.skills`).

## Complexity Tracking

No violations. Feature is a clean extension of existing adapter infrastructure.
