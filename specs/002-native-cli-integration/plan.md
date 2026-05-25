# Implementation Plan: Native CLI Integration

**Branch**: `002-native-cli-integration` | **Date**: 2026-05-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-native-cli-integration/spec.md`

## Summary

Replace Argo's current simplified agent adapters (single-shot `--print` for Claude Code, `codex exec --ephemeral` for Codex) with production-grade bidirectional communication. Claude Code uses stream-json stdin/stdout for multi-turn sessions; Codex uses JSON-RPC 2.0 `app-server` protocol with thread lifecycle. Both support PTY mode via node-pty and dual-channel approval handling.

## Technical Context

**Language/Version**: TypeScript 5.x (ESM modules, `tsx` for dev)

**Primary Dependencies**: Hono (HTTP), better-sqlite3 (DB), node-pty (PTY), ws (WebSocket), zod (validation)

**Storage**: SQLite via better-sqlite3 (WAL mode, existing schema at `packages/daemon/src/db/schema.ts`)

**Testing**: Vitest (unit + integration with mock process factories)

**Target Platform**: macOS / Linux (Node.js 20+)

**Project Type**: Monorepo (pnpm workspaces): `packages/daemon`, `packages/shared`, `packages/ui`

**Performance Goals**: <2s message injection latency, <500ms approval surfacing, 5+ concurrent sessions

**Constraints**: Long-lived processes (no spawn-per-message), cleanup on exit, no native binary recompilation for node-pty (already in deps)

**Scale/Scope**: Single-user local deployment with 5-10 concurrent sessions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Native CLI Fidelity | ✅ PASS | Plan uses `--output-format=stream-json --input-format=stream-json` for Claude Code; `codex app-server` JSON-RPC for Codex; PTY via node-pty |
| II. Dual-Mode Architecture | ✅ PASS | Each adapter has headless (stdio) and PTY (node-pty) launchers |
| III. Approval Sovereignty | ✅ PASS | Full risk context surfaced; dual-channel (Web UI + PTY terminal); first-responder semantics |
| IV. Session Continuity | ✅ PASS | Claude Code: process stays running, stdin injection; Codex: `turn/start` on existing thread; resume via `--resume`/`thread/resume` |
| V. Complete Hook Coverage | ✅ PASS | All 12 hook types registered via CJS relay script POSTing to daemon |
| VI. Observability by Default | ✅ PASS | NormalizedEvents with token usage, context %, model, timestamps |

**Gate result**: PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/002-native-cli-integration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/daemon/src/
├── adapters/                       # NEW — replaces providers/
│   ├── types.ts                    # Shared adapter interfaces
│   ├── claude/
│   │   ├── launcher.ts             # Bidirectional stream-json launcher
│   │   ├── pty-launcher.ts         # PTY mode via node-pty
│   │   ├── parser.ts               # Stream-json envelope parser
│   │   ├── hook-relay.ts           # CJS hook relay script generator
│   │   └── hook-handler.ts         # Incoming hook HTTP handler
│   └── codex/
│       ├── adapter.ts              # JSON-RPC 2.0 client (app-server)
│       ├── pty-launcher.ts         # WS proxy + codex --remote
│       ├── parser.ts               # JSON-RPC response parser
│       └── approval.ts             # Codex-specific approval resolver
├── hook-server/
│   ├── index.ts                    # Extended for all 12 hook types
│   └── approval-handler.ts        # Existing — enhanced for dual-channel
├── session/
│   ├── session-manager.ts          # Refactored: long-lived session registry
│   └── session-store.ts            # DB-backed session state persistence
├── approval/
│   ├── risk-classifier.ts          # Existing — unchanged
│   └── dual-channel.ts             # NEW — first-responder arbitration
├── db/
│   ├── schema.ts                   # Extended with session state columns
│   └── migrations/                 # NEW — schema migration for new columns
└── platform/
    └── index.ts                    # Binary resolution (PATH, login shell)

packages/shared/src/
├── events.ts                       # NormalizedEvent schema (extended)
└── constants.ts                    # Ports, timeouts

packages/ui/src/
├── components/
│   ├── approval/                   # Existing — enhanced for new hook types
│   ├── terminal/                   # NEW — xterm.js for PTY mode
│   └── observability/              # NEW — token usage, context %, status
└── services/
    └── ws-client.ts                # WebSocket event subscription
```

**Structure Decision**: Retain existing monorepo structure. Rename `providers/` to `adapters/` for clarity and to match the reference architecture's naming. The new adapters are a clean replacement, not a patch.

## Complexity Tracking

No constitution violations to justify.
