# Tasks: Native CLI Integration

**Input**: Design documents from `specs/002-native-cli-integration/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/api.md

**Tests**: Not explicitly requested — test tasks omitted.

**Organization**: Tasks grouped by user story for independent implementation. US1 and US2 share foundational work but are independently testable. US3 (Approval) is a cross-cutting concern pulled into its own phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1–US7)
- Paths relative to `packages/daemon/src/` unless otherwise noted

---

## Phase 1: Setup

**Purpose**: Scaffold the new adapter directory structure and shared types

- [x] T001 Create adapter directory structure: `packages/daemon/src/adapters/`, `adapters/claude/`, `adapters/codex/`, `adapters/types.ts`
- [x] T002 [P] Define shared adapter interfaces (ManagedRuntime, AdapterConfig, LaunchOptions) in `packages/daemon/src/adapters/types.ts`
- [x] T003 [P] Extend NormalizedEvent union type with new event types (token_usage, hook_event, streaming_delta, approval_resolved) in `packages/shared/src/events.ts`
- [x] T004 [P] Add platform binary resolution module at `packages/daemon/src/platform/index.ts` (PATH lookup, login shell detection)
- [x] T005 [P] Create DB migration file to extend sessions table with `mode`, `last_activity_at`, `token_usage_json`, `settings_path` columns at `packages/daemon/src/db/migrations/001-session-extensions.ts`
- [x] T006 [P] Add `resolved_by` and `reason` columns to approvals table in `packages/daemon/src/db/migrations/001-session-extensions.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Implement session store (DB-backed registry of active sessions with status tracking) in `packages/daemon/src/session/session-store.ts`
- [x] T008 [P] Implement dual-channel approval arbitration (first-responder semantics, auto-timeout at 30s) in `packages/daemon/src/approval/dual-channel.ts`
- [x] T009 [P] Create hook relay CJS script generator (produces per-session Node.js script that POSTs to daemon) in `packages/daemon/src/adapters/claude/hook-relay.ts`
- [x] T010 [P] Extend hook server to handle all 12 hook types (not just PreToolUse) in `packages/daemon/src/hook-server/index.ts`
- [x] T011 Refactor session-manager to use long-lived session registry instead of spawn-per-message in `packages/daemon/src/session/session-manager.ts`
- [ ] T012 [P] Add session management API routes (POST /sessions, POST /sessions/:id/message, POST /sessions/:id/resume, DELETE /sessions/:id) in `packages/daemon/src/api/sessions.ts`

**Checkpoint**: Foundation ready — adapter implementations can begin

---

## Phase 3: User Story 1 — Multi-Turn Claude Code (Priority: P1) 🎯 MVP

**Goal**: Users can conduct multi-turn conversations with Claude Code without process restart

**Independent Test**: Send 3+ sequential messages; verify each response references prior context; verify no process restart between messages

### Implementation for User Story 1

- [x] T013 [US1] Implement Claude Code bidirectional launcher (spawn with `--output-format=stream-json --input-format=stream-json`, keep process alive) in `packages/daemon/src/adapters/claude/launcher.ts`
- [x] T014 [US1] Implement stream-json envelope parser (handle assistant, stream_event, result, system envelope types) in `packages/daemon/src/adapters/claude/parser.ts`
- [x] T015 [US1] Implement stdin message injection (format user turn as JSON payload, write to process stdin) in `packages/daemon/src/adapters/claude/launcher.ts`
- [x] T016 [US1] Implement token usage extraction from result envelopes (inputTokens, outputTokens, cachedInputTokens, context metrics) in `packages/daemon/src/adapters/claude/parser.ts`
- [x] T017 [US1] Implement streaming delta forwarding (parse content_block_delta envelopes → emit streaming_delta NormalizedEvents) in `packages/daemon/src/adapters/claude/parser.ts`
- [x] T018 [US1] Wire Claude adapter into session-manager (lookup existing session → inject message; else spawn new) in `packages/daemon/src/session/session-manager.ts`
- [x] T019 [US1] Implement process health monitoring (detect exit/crash → update session status → emit session_end event) in `packages/daemon/src/adapters/claude/launcher.ts`
- [x] T020 [US1] Generate settings JSON with session-id and hook relay path; pass via `--settings` flag in `packages/daemon/src/adapters/claude/launcher.ts`

**Checkpoint**: Multi-turn Claude Code conversations work end-to-end

---

## Phase 4: User Story 2 — Multi-Turn Codex (Priority: P1)

**Goal**: Users can conduct multi-turn conversations with Codex via app-server protocol

**Independent Test**: Send 3+ messages to Codex; verify thread continuity (same thread ID); verify responses reference prior context

### Implementation for User Story 2

- [x] T021 [US2] Implement Codex JSON-RPC client (spawn `codex app-server`, manage request IDs, parse responses) in `packages/daemon/src/adapters/codex/adapter.ts`
- [x] T022 [US2] Implement JSON-RPC handshake (initialize → initialized → thread/start) in `packages/daemon/src/adapters/codex/adapter.ts`
- [x] T023 [US2] Implement turn injection via `turn/start` JSON-RPC method on existing thread in `packages/daemon/src/adapters/codex/adapter.ts`
- [ ] T024 [US2] Implement JSON-RPC response parser (extract message content, handle notifications) in `packages/daemon/src/adapters/codex/parser.ts`
- [ ] T025 [US2] Implement Codex approval request handler (parse server-initiated approval methods, deduplicate, 30s timer) in `packages/daemon/src/adapters/codex/approval.ts`
- [ ] T026 [US2] Implement approval response writer (format JSON-RPC result, write to stdin) in `packages/daemon/src/adapters/codex/adapter.ts`
- [ ] T027 [US2] Wire Codex adapter into session-manager (lookup existing thread → turn/start; else spawn new) in `packages/daemon/src/session/session-manager.ts`
- [ ] T028 [US2] Implement Codex process lifecycle (exit handler, pending request rejection, approval cleanup) in `packages/daemon/src/adapters/codex/adapter.ts`

**Checkpoint**: Multi-turn Codex conversations work with thread persistence

---

## Phase 5: User Story 3 — Tool Approval Flow (Priority: P1)

**Goal**: Approval requests appear in Web UI with full context; user can approve/deny; agent proceeds

**Independent Test**: Trigger a tool execution; verify approval card with tool name, args, risk, paths appears; approve and verify execution

### Implementation for User Story 3

- [ ] T029 [US3] Implement full hook payload parser for PreToolUse (extract tool_name, tool_input, session context) in `packages/daemon/src/hook-server/index.ts`
- [ ] T030 [US3] Emit approval_request NormalizedEvent with risk level, affected paths, and reason via event bus in `packages/daemon/src/hook-server/approval-handler.ts`
- [ ] T031 [US3] Implement approval decision API endpoint (POST /api/approvals/:id/decide) with dual-channel resolution in `packages/daemon/src/api/approvals.ts`
- [ ] T032 [P] [US3] Implement approval card component in UI showing tool name, arguments, risk badge, file paths, approve/deny buttons in `packages/ui/src/components/approval/approval-card.tsx`
- [ ] T033 [P] [US3] Implement pending approvals list API (GET /api/approvals/pending) in `packages/daemon/src/api/approvals.ts`
- [ ] T034 [US3] Wire approval resolution back to Claude Code hook response (allow/deny JSON) in `packages/daemon/src/hook-server/approval-handler.ts`
- [ ] T035 [US3] Wire approval resolution back to Codex stdin (JSON-RPC result with approved boolean) in `packages/daemon/src/adapters/codex/approval.ts`
- [ ] T036 [US3] Implement auto-deny timeout (30s) with timer cleanup on resolution in `packages/daemon/src/approval/dual-channel.ts`

**Checkpoint**: Tool approvals surface in UI and resolve correctly for both providers

---

## Phase 6: User Story 4 — Interactive Terminal Mode (Priority: P2)

**Goal**: Users can launch agents in PTY mode with full terminal capabilities

**Independent Test**: Start Claude Code in PTY mode; verify colored output; resize window; use a slash command

### Implementation for User Story 4

- [ ] T037 [US4] Implement Claude Code PTY launcher (node-pty spawn via login shell, support resume, settings injection) in `packages/daemon/src/adapters/claude/pty-launcher.ts`
- [ ] T038 [US4] Implement Codex PTY launcher with WebSocket proxy (app-server ↔ WS proxy ↔ codex --remote) in `packages/daemon/src/adapters/codex/pty-launcher.ts`
- [ ] T039 [US4] Create WebSocket PTY proxy endpoint (bidirectional binary frames + resize JSON) at `/ws/pty` in `packages/daemon/src/api/sessions.ts`
- [ ] T040 [P] [US4] Implement xterm.js terminal component in UI with WebSocket connection in `packages/ui/src/components/terminal/terminal-view.tsx`
- [ ] T041 [P] [US4] Implement terminal resize propagation (UI cols/rows → WS message → pty.resize) in `packages/daemon/src/adapters/claude/pty-launcher.ts`
- [ ] T042 [US4] Add mode selector (headless/PTY) to session creation UI in `packages/ui/src/components/chat/message-input.tsx`
- [ ] T043 [US4] Wire PTY launchers into session-manager with mode-based dispatch in `packages/daemon/src/session/session-manager.ts`

**Checkpoint**: Both providers work in full PTY mode with terminal interaction

---

## Phase 7: User Story 5 — Session Resume (Priority: P2)

**Goal**: Users can resume previous conversations after browser close

**Independent Test**: Start conversation, kill daemon, restart, select conversation, send message — verify agent has prior context

### Implementation for User Story 5

- [ ] T044 [US5] Implement Claude Code session resume (detect existing session → spawn with `--resume <session-id>`) in `packages/daemon/src/adapters/claude/launcher.ts`
- [ ] T045 [US5] Implement Codex thread resume (detect existing thread_id → `thread/resume` JSON-RPC) in `packages/daemon/src/adapters/codex/adapter.ts`
- [ ] T046 [US5] Implement daemon startup recovery (scan sessions in `running` state → mark as `crashed`) in `packages/daemon/src/session/session-store.ts`
- [ ] T047 [US5] Add resume API endpoint (POST /api/sessions/:id/resume) with provider-specific logic in `packages/daemon/src/api/sessions.ts`
- [ ] T048 [US5] Show session status in UI conversation list (running/idle/crashed indicators) in `packages/ui/src/components/sidebar/conversation-item.tsx`
- [ ] T049 [US5] Add "Resume" button for crashed/stopped sessions in conversation header in `packages/ui/src/components/chat/message-input.tsx`

**Checkpoint**: Sessions survive daemon restart and browser close

---

## Phase 8: User Story 6 — Real-Time Observability (Priority: P2)

**Goal**: Token usage, context %, and tool activity visible in real-time

**Independent Test**: Start conversation; trigger tool use; verify token counter updates, context % shows, tool activity appears

### Implementation for User Story 6

- [ ] T050 [US6] Emit token_usage NormalizedEvents from Claude parser on every result envelope in `packages/daemon/src/adapters/claude/parser.ts`
- [ ] T051 [US6] Implement WebSocket event stream endpoint (WS /ws/events?sessionId=) for real-time event delivery in `packages/daemon/src/api/events.ts`
- [ ] T052 [P] [US6] Create token usage display component (input/output/cached tokens, context %) in `packages/ui/src/components/observability/token-usage.tsx`
- [ ] T053 [P] [US6] Create session status indicator component (running/idle/crashed with live updates) in `packages/ui/src/components/observability/session-status.tsx`
- [ ] T054 [US6] Wire WebSocket client in UI to subscribe to session events in `packages/ui/src/services/ws-client.ts`
- [ ] T055 [US6] Persist token usage snapshots to session table on each update in `packages/daemon/src/session/session-store.ts`
- [ ] T056 [US6] Add status API endpoint (GET /api/sessions/:id/status) returning current metrics in `packages/daemon/src/api/sessions.ts`

**Checkpoint**: Real-time observability dashboard shows live metrics

---

## Phase 9: User Story 7 — Hook Activity Feed (Priority: P3)

**Goal**: All 12 lifecycle hooks visible in structured activity feed

**Independent Test**: Start session, trigger tool use and sub-agent spawn; verify all hook events appear in feed

### Implementation for User Story 7

- [ ] T057 [US7] Implement hook event normalization (convert all 12 hook types → hook_event NormalizedEvent) in `packages/daemon/src/hook-server/index.ts`
- [ ] T058 [US7] Implement PostToolUse handler (capture tool results, emit tool_result events) in `packages/daemon/src/hook-server/index.ts`
- [ ] T059 [P] [US7] Implement SubagentStart/SubagentStop handler (emit lifecycle events) in `packages/daemon/src/hook-server/index.ts`
- [ ] T060 [P] [US7] Implement Elicitation handler (surface agent question to UI, relay user answer back) in `packages/daemon/src/hook-server/index.ts`
- [ ] T061 [P] [US7] Create activity feed UI component with event filtering in `packages/ui/src/components/observability/activity-feed.tsx`
- [ ] T062 [US7] Wire all hook events to WebSocket event stream for real-time delivery in `packages/daemon/src/api/events.ts`

**Checkpoint**: Complete hook coverage visible in UI activity feed

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, hardening, and documentation

- [ ] T063 [P] Remove old `packages/daemon/src/providers/` directory (replaced by adapters/)
- [ ] T064 [P] Update all imports referencing old providers/ paths across the daemon package
- [ ] T065 [P] Implement temp file cleanup on session exit (delete settings JSON, hook relay scripts) in `packages/daemon/src/adapters/claude/launcher.ts`
- [ ] T066 [P] Add graceful shutdown handler (SIGTERM → terminate all active sessions → cleanup) in `packages/daemon/src/index.ts`
- [ ] T067 Update session-manager orchestrator integration for group chat with new adapter interface in `packages/daemon/src/orchestrator/task-executor.ts`
- [ ] T068 [P] Add error boundaries and connection loss handling to UI WebSocket client in `packages/ui/src/services/ws-client.ts`
- [ ] T069 Validate all API routes work end-to-end with both providers

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **User Stories (Phases 3–9)**: All depend on Phase 2 completion
  - US1 (Claude multi-turn) and US2 (Codex multi-turn) can proceed in parallel
  - US3 (Approvals) depends on US1 and US2 having basic adapter structure
  - US4 (PTY) depends on US1/US2 (requires working adapters to add PTY mode)
  - US5 (Resume) depends on US1/US2 (requires session persistence)
  - US6 (Observability) depends on US1/US2 (requires event emission)
  - US7 (Hooks) depends on T009/T010 from Foundational
- **Polish (Phase 10)**: Depends on all user story phases being complete

### User Story Dependencies

- **US1 (Claude multi-turn)**: Foundational only — can start first
- **US2 (Codex multi-turn)**: Foundational only — can start parallel to US1
- **US3 (Approvals)**: US1 + US2 basic adapter structure (T013, T021)
- **US4 (PTY)**: US1 + US2 complete (builds on working adapters)
- **US5 (Resume)**: US1 + US2 complete (needs session persistence working)
- **US6 (Observability)**: US1 + US2 (needs event emission working)
- **US7 (Hooks)**: Foundational T009/T010 + US1 (needs hook relay working)

### Parallel Opportunities

Within Phase 1: T002, T003, T004, T005, T006 all in parallel
Within Phase 2: T008, T009, T010 in parallel
US1 and US2: Fully parallel (different adapter directories)
Within US3: T032, T033 in parallel
Within US4: T040, T041 in parallel
Within US6: T052, T053 in parallel
Within US7: T059, T060, T061 in parallel

---

## Parallel Example: Foundation + MVP

```bash
# Phase 1 — all parallel:
Task T002: "Define shared adapter interfaces in packages/daemon/src/adapters/types.ts"
Task T003: "Extend NormalizedEvent in packages/shared/src/events.ts"
Task T004: "Platform binary resolution in packages/daemon/src/platform/index.ts"
Task T005: "DB migration in packages/daemon/src/db/migrations/001-session-extensions.ts"

# Phase 3 (US1) — models/parsers parallel, then sequential:
Task T013: "Claude launcher in packages/daemon/src/adapters/claude/launcher.ts"
Task T014: "Stream-json parser in packages/daemon/src/adapters/claude/parser.ts"
# Then sequentially:
Task T015: "Stdin injection (depends on T013)"
Task T018: "Wire into session-manager (depends on T013, T014)"
```

---

## Implementation Strategy

### MVP First (US1 Only — Claude Code Multi-Turn)

1. Complete Phase 1: Setup (T001–T006)
2. Complete Phase 2: Foundational (T007–T012)
3. Complete Phase 3: US1 — Claude Code multi-turn (T013–T020)
4. **STOP and VALIDATE**: Send 3+ messages, verify context continuity
5. This alone delivers massive value over current `--print` single-shot mode

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 (Claude multi-turn) → Test → **MVP deployed!**
3. US2 (Codex multi-turn) → Test → Both providers working
4. US3 (Approvals) → Test → Security-complete
5. US4 (PTY) → Test → Power-user mode available
6. US5 (Resume) → Test → Session persistence
7. US6 (Observability) → Test → Full visibility
8. US7 (Hooks) → Test → Complete hook coverage
9. Polish → Production-ready

### Parallel Team Strategy

With 2 developers after Foundational:
- Developer A: US1 (Claude) → US3 (Approvals) → US5 (Resume)
- Developer B: US2 (Codex) → US4 (PTY) → US6 (Observability)
- Together: US7 (Hooks) → Polish

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- Each story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- The old `providers/` directory is preserved until Phase 10 for safe rollback
