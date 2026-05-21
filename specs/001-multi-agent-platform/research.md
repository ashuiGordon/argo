# Research: Argo Multi-Agent Collaboration Platform

**Date**: 2026-05-21 | **Status**: Complete

## Decision Log

### 1. Agent CLI Integration Pattern

**Decision**: Dual-mode adapter pattern — each Agent CLI gets its own adapter that normalizes output to a shared event format.

**Rationale**: Claude Code uses HTTP Hooks (POST callbacks), while Codex uses JSON-RPC over stdio. These protocols are fundamentally different, so a per-provider adapter is the cleanest separation. Both adapters emit the same NormalizedEvent type.

**Alternatives considered**:
- Single adapter with protocol detection — rejected because it conflates concerns and makes testing harder
- Plugin system with dynamic loading — rejected as over-engineering for 2 providers

### 2. Event Persistence Strategy

**Decision**: Append-only event table in SQLite with monotonically increasing sequence_number as primary key. Events are the single source of truth; UI state is derived.

**Rationale**: Event sourcing provides natural audit trail, enables WebSocket replay on reconnect, and avoids complex state synchronization. SQLite in WAL mode provides sufficient write throughput (>10k inserts/s) for a single-user scenario.

**Alternatives considered**:
- Mutable state with change tracking — rejected because replay would require separate change log anyway
- Separate event log + materialized views — rejected as unnecessary complexity for local-first app

### 3. Approval Blocking Mechanism

**Decision**: For Claude Code, hold the HTTP response open on the Hook Server until user decides. For Codex, hold the JSON-RPC response pending until decision.

**Rationale**: Both CLIs naturally block waiting for their respective response. This avoids polling or callbacks and leverages each protocol's native flow control.

**Alternatives considered**:
- Polling-based approach (Agent checks periodically) — rejected because it adds latency and complexity
- WebSocket notification to CLI — rejected because both CLIs already expect synchronous responses

### 4. Orchestrator Task Decomposition

**Decision**: LLM-based decomposition using a Coordinator prompt that outputs structured JSON task arrays with dependency declarations.

**Rationale**: Only an LLM can understand natural language goals well enough to decompose them into assignable sub-tasks. The structured JSON output format (validated by Zod) ensures reliable parsing.

**Alternatives considered**:
- Rule-based decomposition — rejected because it can't handle arbitrary goals
- User-manual decomposition — rejected as it defeats the purpose of automation

### 5. Frontend State Management

**Decision**: Zustand v5 with slice pattern. WebSocket events drive state updates. Optimistic UI for user actions.

**Rationale**: Zustand is lightweight, supports subscribeWithSelector for granular rerenders, and has excellent TypeScript support. The slice pattern keeps the single store organized without Redux boilerplate.

**Alternatives considered**:
- Redux Toolkit — rejected as too heavy for this use case
- React Context + useReducer — rejected because it causes unnecessary re-renders without manual memoization

### 6. Real-time Communication Protocol

**Decision**: Native WebSocket (ws library) with custom sequence-number replay protocol. Single connection multiplexed across conversations via channel subscriptions.

**Rationale**: Simpler than Socket.IO (no fallback transport needed for modern browsers), lower overhead, and the sequence replay requirement is custom anyway. Single connection reduces resource usage.

**Alternatives considered**:
- Socket.IO — rejected because its abstraction layer adds overhead without benefit (no need for long-polling fallback)
- Server-Sent Events — rejected because bidirectional communication is needed (user sends messages, approval decisions)

### 7. Terminal Rendering

**Decision**: node-pty on daemon side creates PTY for each Agent process. PTY output is streamed via WebSocket as binary frames. xterm.js on frontend renders with full ANSI support.

**Rationale**: PTY provides authentic terminal experience including colors, cursor movement, and interactive prompts. xterm.js is the de facto standard for web-based terminal emulation.

**Alternatives considered**:
- Raw stdout parsing with ANSI-to-HTML conversion — rejected because it loses interactive terminal capabilities
- SSH-over-WebSocket — rejected as unnecessary for local processes

### 8. Monorepo Tooling

**Decision**: pnpm workspaces with 3 packages (shared, daemon, ui). TypeScript project references for incremental builds.

**Rationale**: pnpm is the fastest package manager with native workspace support. Three packages provide clean separation while keeping shared types DRY. Project references enable fast incremental compilation.

**Alternatives considered**:
- Turborepo — rejected as unnecessary build orchestration for 3 packages
- Single package with path aliases — rejected because it prevents independent builds and blurs boundaries
