# Implementation Plan: Argo Multi-Agent Collaboration Platform

**Branch**: `001-multi-agent-platform` | **Date**: 2026-05-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-multi-agent-platform/spec.md`

## Summary

Argo is an IM-style multi-Agent collaboration platform. Users interact with AI Agents (Claude Code, Codex, custom) through conversations. The system consists of a long-running Node.js daemon (managing Agent subprocesses, event normalization, approval queues, and WebSocket broadcasting) and a React SPA frontend (chat UI, terminal view, orchestration visualization). The architecture follows an event-sourced pattern with SQLite as append-only store and WebSocket with sequence-number replay for real-time synchronization.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+ (ESM throughout)

**Primary Dependencies**:
- Backend: Hono (HTTP), ws (WebSocket), better-sqlite3 (database), node-pty (terminal), Zod v4 (validation), jsonwebtoken + bcrypt (auth)
- Frontend: React 18, Vite 6, Zustand v5, React Router v7, Tailwind CSS 4 + shadcn/ui + Radix UI, xterm.js, Shiki (code highlighting), react-diff-viewer

**Storage**: SQLite (better-sqlite3, WAL mode) — single file, zero external dependencies

**Testing**: Vitest (unit + integration), Playwright (E2E)

**Target Platform**: Web application (modern desktop browsers, minimum 1024px), local-first single-user

**Project Type**: pnpm monorepo — daemon (backend) + ui (frontend) + shared (types/schemas)

**Performance Goals**:
- Streaming latency < 100ms (CLI stdout → frontend render)
- Conversation list load < 500ms
- WebSocket reconnect + catch-up < 3s
- Event replay throughput > 1000 events/s
- Virtual scroll support for 10,000+ messages

**Constraints**:
- Approval response timeout: 60 seconds
- Max parallel orchestration tasks: 5 (configurable)
- Single-user, local deployment only
- No external database services

**Scale/Scope**: Single user, ~50 conversations, ~5 concurrent Agent sessions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution is in template state (not yet ratified for this project). No gate violations to evaluate. Proceeding with standard best practices:
- Simplicity: minimal abstractions, direct SQL, no ORM
- Test-first where applicable (Vitest for core logic)
- Type safety end-to-end via shared Zod schemas

## Project Structure

### Documentation (this feature)

```text
specs/001-multi-agent-platform/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (WebSocket + REST API contracts)
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
packages/
├── shared/                    # Shared types, schemas, constants
│   ├── src/
│   │   ├── schemas/           # Zod schemas (NormalizedEvent, API types)
│   │   ├── types/             # TypeScript type definitions
│   │   └── constants/         # Shared constants (risk levels, ports, etc.)
│   ├── package.json
│   └── tsconfig.json
│
├── daemon/                    # Backend Node.js daemon
│   ├── src/
│   │   ├── index.ts           # Entry point — starts all servers
│   │   ├── api/               # Hono REST API routes
│   │   ├── ws/                # WebSocket server + sequence replay
│   │   ├── hook-server/       # Claude Code Hook HTTP server
│   │   ├── providers/         # Agent adapters (Claude, Codex)
│   │   ├── orchestrator/      # Task DAG, scheduler, coordinator
│   │   ├── approval/          # Approval queue manager
│   │   ├── event-bus/         # Typed EventEmitter + persistence
│   │   ├── db/                # SQLite schema, migrations, queries
│   │   ├── auth/              # JWT auth middleware
│   │   └── discovery/         # External session polling
│   ├── package.json
│   └── tsconfig.json
│
└── ui/                        # React SPA frontend
    ├── src/
    │   ├── main.tsx           # Entry point
    │   ├── app.tsx            # Router + layout
    │   ├── components/        # Reusable UI components
    │   │   ├── chat/          # Message bubbles, input, streaming
    │   │   ├── sidebar/       # Conversation list, search
    │   │   ├── approval/      # Approval cards
    │   │   ├── terminal/      # xterm.js wrapper
    │   │   ├── orchestrator/  # Task DAG visualization
    │   │   ├── preview/       # iframe preview cards
    │   │   └── code/          # Code blocks, diff viewer
    │   ├── pages/             # Route pages
    │   ├── stores/            # Zustand stores (slices)
    │   ├── hooks/             # Custom React hooks
    │   ├── services/          # WebSocket client, API client
    │   └── lib/               # Utilities
    ├── package.json
    ├── vite.config.ts
    └── tsconfig.json

pnpm-workspace.yaml
package.json                   # Root — scripts, devDependencies
tsconfig.base.json             # Shared TS config
```

**Structure Decision**: pnpm monorepo with 3 packages (shared, daemon, ui). The `shared` package provides type safety across the stack via Zod schemas that serve as both runtime validators and TypeScript type sources. This avoids type drift between frontend and backend.

## Complexity Tracking

No constitution violations to justify.
