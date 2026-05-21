# Tasks: Argo Multi-Agent Collaboration Platform

**Input**: Design documents from `/specs/001-multi-agent-platform/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in spec. Tests omitted from task list.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, monorepo structure, and tooling

- [ ] T001 Initialize pnpm monorepo with pnpm-workspace.yaml and root package.json
- [ ] T002 [P] Create packages/shared/ package with package.json and tsconfig.json
- [ ] T003 [P] Create packages/daemon/ package with package.json and tsconfig.json
- [ ] T004 [P] Create packages/ui/ package with package.json and tsconfig.json
- [ ] T005 Create tsconfig.base.json with shared TypeScript configuration (ESM, strict, project references)
- [ ] T006 [P] Configure ESLint and Prettier in root with TypeScript support
- [ ] T007 [P] Configure Vitest in root vitest.workspace.ts for monorepo testing
- [ ] T008 Install all dependencies per plan.md (Hono, ws, better-sqlite3, node-pty, Zod, React, Vite, Zustand, xterm.js, Shiki, etc.)
- [ ] T009 Add root package.json scripts: dev, build, test, typecheck, lint

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T010 Define NormalizedEvent Zod schemas (discriminated union) in packages/shared/src/schemas/events.ts
- [ ] T011 [P] Define API request/response Zod schemas in packages/shared/src/schemas/api.ts
- [ ] T012 [P] Define shared constants (ports, risk levels, event types) in packages/shared/src/constants/index.ts
- [ ] T013 [P] Define TypeScript types exported from packages/shared/src/types/index.ts
- [ ] T014 Create SQLite database schema and initialization script in packages/daemon/src/db/schema.ts (all tables: users, agents, conversations, events, approvals, etc.)
- [ ] T015 Implement database access layer (query helpers, prepared statements) in packages/daemon/src/db/queries.ts
- [ ] T016 Implement EventBus (typed EventEmitter) in packages/daemon/src/event-bus/index.ts
- [ ] T017 [P] Implement JWT auth utilities (sign, verify, middleware) in packages/daemon/src/auth/index.ts
- [ ] T018 Implement Hono REST API server skeleton with auth middleware in packages/daemon/src/api/index.ts
- [ ] T019 Implement WebSocket server with connection management in packages/daemon/src/ws/index.ts
- [ ] T020 Implement event persistence (append to SQLite, assign sequence_number) in packages/daemon/src/event-bus/persist.ts
- [ ] T021 Implement WebSocket event broadcast (subscribe/unsubscribe per conversation) in packages/daemon/src/ws/broadcast.ts
- [ ] T022 Implement sequence-number replay on WebSocket reconnect (lastSeenSequence → replay → catchup_complete) in packages/daemon/src/ws/replay.ts
- [ ] T023 Create daemon entry point that starts HTTP server + WS server + Hook server in packages/daemon/src/index.ts
- [ ] T024 [P] Setup Vite + React project skeleton in packages/ui/ (main.tsx, app.tsx, vite.config.ts with proxy to daemon)
- [ ] T025 [P] Implement Zustand store skeleton with slices (auth, conversations, messages, approvals) in packages/ui/src/stores/
- [ ] T026 [P] Implement WebSocket client service (connect, reconnect with exponential backoff, sequence replay) in packages/ui/src/services/ws-client.ts
- [ ] T027 [P] Implement REST API client service (fetch wrapper with JWT auth) in packages/ui/src/services/api-client.ts
- [ ] T028 Implement auth API routes (register, login) in packages/daemon/src/api/auth.ts
- [ ] T029 [P] Implement login/register pages in packages/ui/src/pages/auth.tsx
- [ ] T030 Implement auth guard (redirect to login if no token) in packages/ui/src/components/auth-guard.tsx

**Checkpoint**: Foundation ready - daemon starts, database initialized, WebSocket connects, user can register/login

---

## Phase 3: User Story 1 - Single Agent Chat (Priority: P1) 🎯 MVP

**Goal**: User creates a 1v1 conversation with an Agent and exchanges messages with streaming responses

**Independent Test**: Create a conversation, send a message, verify streaming Agent response appears in chat

### Implementation for User Story 1

- [ ] T031 [US1] Implement conversations CRUD API routes in packages/daemon/src/api/conversations.ts
- [ ] T032 [US1] Implement agents list API route in packages/daemon/src/api/agents.ts
- [ ] T033 [US1] Seed built-in Agents (Claude Code, Codex) in packages/daemon/src/db/seed.ts
- [ ] T034 [US1] Implement Claude Code adapter: spawn CLI process with --output-format=stream-json in packages/daemon/src/providers/claude/adapter.ts
- [ ] T035 [US1] Implement Claude Code Hook server (HTTP POST receiver) in packages/daemon/src/hook-server/index.ts
- [ ] T036 [US1] Generate temporary Hook relay script (CJS) pointing to Hook server in packages/daemon/src/providers/claude/hook-script.ts
- [ ] T037 [US1] Implement Claude Code event parser (Hook events → NormalizedEvent) in packages/daemon/src/providers/claude/parser.ts
- [ ] T038 [US1] Implement send-message API route (creates session, sends user message to Agent) in packages/daemon/src/api/messages.ts
- [ ] T039 [US1] Implement session manager (create, track, cleanup Agent sessions) in packages/daemon/src/providers/session-manager.ts
- [ ] T040 [P] [US1] Implement sidebar conversation list component in packages/ui/src/components/sidebar/conversation-list.tsx
- [ ] T041 [P] [US1] Implement Agent selection panel (modal with Agent cards) in packages/ui/src/components/sidebar/agent-picker.tsx
- [ ] T042 [US1] Implement chat page layout (sidebar + chat area) in packages/ui/src/pages/chat.tsx
- [ ] T043 [US1] Implement message input component (multiline, Enter to send, Shift+Enter newline) in packages/ui/src/components/chat/message-input.tsx
- [ ] T044 [US1] Implement message bubble component (user right-aligned, Agent left-aligned, Markdown rendering) in packages/ui/src/components/chat/message-bubble.tsx
- [ ] T045 [US1] Implement streaming message display (typing indicator, incremental text) in packages/ui/src/components/chat/streaming-message.tsx
- [ ] T046 [US1] Implement code block component with Shiki syntax highlighting and copy button in packages/ui/src/components/code/code-block.tsx
- [ ] T047 [US1] Wire up conversations Zustand slice (CRUD, active conversation, message list) in packages/ui/src/stores/conversations.ts
- [ ] T048 [US1] Wire up WebSocket event handler to update Zustand store on incoming events in packages/ui/src/services/ws-handler.ts
- [ ] T049 [US1] Implement virtual scroll for message list (support 10,000+ messages) in packages/ui/src/components/chat/message-list.tsx

**Checkpoint**: User can register, create a conversation with Claude Code, send messages, and see streaming responses with code highlighting

---

## Phase 4: User Story 2 - Conversation Management (Priority: P1)

**Goal**: User manages multiple conversations with search, pin, archive, and unread badges

**Independent Test**: Create 5+ conversations, verify sort order, test pin/archive/search, check unread badges

### Implementation for User Story 2

- [ ] T050 [US2] Add pin/archive/delete endpoints to conversations API in packages/daemon/src/api/conversations.ts
- [ ] T051 [US2] Add search query support to GET /api/conversations in packages/daemon/src/api/conversations.ts
- [ ] T052 [US2] Track unread count per conversation (events since last user view) in packages/daemon/src/db/queries.ts
- [ ] T053 [P] [US2] Implement conversation item component (avatar, name, preview, timestamp, unread badge) in packages/ui/src/components/sidebar/conversation-item.tsx
- [ ] T054 [P] [US2] Implement search input in sidebar in packages/ui/src/components/sidebar/search-bar.tsx
- [ ] T055 [US2] Implement conversation context menu (pin, archive, delete) in packages/ui/src/components/sidebar/conversation-menu.tsx
- [ ] T056 [US2] Update conversations Zustand slice with pin/archive/search/unread state in packages/ui/src/stores/conversations.ts

**Checkpoint**: User can manage multiple conversations fluidly — search, pin, archive, see unread counts

---

## Phase 5: User Story 3 - Operation Approval (Priority: P1)

**Goal**: Agent dangerous operations are intercepted, shown as approval cards, and blocked until user decides

**Independent Test**: Trigger a risky operation, verify approval card appears, test approve/deny/timeout flows

### Implementation for User Story 3

- [ ] T057 [US3] Implement approval queue manager (register, decide, timeout) in packages/daemon/src/approval/queue.ts
- [ ] T058 [US3] Implement risk classification engine (tool → risk level mapping) in packages/daemon/src/approval/risk-classifier.ts
- [ ] T059 [US3] Implement Hook server approval blocking (hold HTTP response until decision) in packages/daemon/src/hook-server/approval-handler.ts
- [ ] T060 [US3] Implement always-allow rules storage and matching in packages/daemon/src/approval/always-allow.ts
- [ ] T061 [US3] Implement approval API routes (decide, list pending, create always-allow rule) in packages/daemon/src/api/approvals.ts
- [ ] T062 [US3] Emit approval_request and approval_resolved NormalizedEvents through EventBus in packages/daemon/src/approval/queue.ts
- [ ] T063 [P] [US3] Implement approval card component (risk badge, operation details, approve/deny buttons) in packages/ui/src/components/approval/approval-card.tsx
- [ ] T064 [P] [US3] Implement approval timeout countdown display in packages/ui/src/components/approval/timeout-indicator.tsx
- [ ] T065 [US3] Wire up approvals Zustand slice (pending list, decide action) in packages/ui/src/stores/approvals.ts
- [ ] T066 [US3] Integrate approval cards into chat message stream in packages/ui/src/components/chat/message-list.tsx

**Checkpoint**: Agent risky operations show approval cards, user can approve/deny, timeout works, always-allow rules function

---

## Phase 6: User Story 4 - Group Chat with Task Orchestration (Priority: P2)

**Goal**: User creates group chat, Orchestrator decomposes goal into task DAG, executes in parallel, synthesizes results

**Independent Test**: Create group with 2+ Agents, send complex goal, verify DAG display, approve plan, check parallel execution and summary

### Implementation for User Story 4

- [ ] T067 [US4] Implement Orchestrator coordinator (LLM-based task decomposition) in packages/daemon/src/orchestrator/coordinator.ts
- [ ] T068 [US4] Implement TaskQueue (add, complete, fail, skip, getByStatus) in packages/daemon/src/orchestrator/task-queue.ts
- [ ] T069 [US4] Implement dependency resolver (two-pass: create tasks → resolve title refs to IDs) in packages/daemon/src/orchestrator/dependency-resolver.ts
- [ ] T070 [US4] Implement round-based scheduler (find ready → Promise.all → unlock successors) in packages/daemon/src/orchestrator/scheduler.ts
- [ ] T071 [US4] Implement Semaphore for concurrency control (pool-level + agent-level mutex) in packages/daemon/src/orchestrator/semaphore.ts
- [ ] T072 [US4] Implement cascade failure (mark transitive dependents as failed) in packages/daemon/src/orchestrator/task-queue.ts
- [ ] T073 [US4] Implement simple-goal short circuit (< 200 chars, no collaboration keywords → direct route) in packages/daemon/src/orchestrator/router.ts
- [ ] T074 [US4] Implement result synthesis (Coordinator LLM summarizes completed/failed/skipped tasks) in packages/daemon/src/orchestrator/synthesizer.ts
- [ ] T075 [US4] Emit OrchestratorEvents through EventBus (decomposition_start, task_start, task_complete, synthesis_complete) in packages/daemon/src/orchestrator/events.ts
- [ ] T076 [US4] Implement Codex adapter: spawn codex process, JSON-RPC over stdio in packages/daemon/src/providers/codex/adapter.ts
- [ ] T077 [US4] Implement Codex JSON-RPC protocol (initialize, thread/start, turn/start) in packages/daemon/src/providers/codex/rpc.ts
- [ ] T078 [US4] Implement Codex event parser (notifications → NormalizedEvent) in packages/daemon/src/providers/codex/parser.ts
- [ ] T079 [US4] Implement Codex approval handling (hold JSON-RPC response for server-initiated requests) in packages/daemon/src/providers/codex/approval.ts
- [ ] T080 [P] [US4] Implement group chat creation UI (multi-Agent selector) in packages/ui/src/components/sidebar/group-chat-creator.tsx
- [ ] T081 [P] [US4] Implement task DAG visualization component (collapsible cards with status, dependency lines) in packages/ui/src/components/orchestrator/task-dag.tsx
- [ ] T082 [P] [US4] Implement plan approval gate UI (approve/modify/reject execution plan) in packages/ui/src/components/orchestrator/plan-approval.tsx
- [ ] T083 [US4] Implement task status cards (progress indicator per task: pending/blocked/running/done/failed) in packages/ui/src/components/orchestrator/task-card.tsx
- [ ] T084 [US4] Wire up orchestrator Zustand slice (tasks, status updates, plan approval) in packages/ui/src/stores/orchestrator.ts
- [ ] T085 [US4] Integrate orchestrator visualization into group chat message stream in packages/ui/src/pages/chat.tsx

**Checkpoint**: Group chat orchestration works end-to-end — decomposition, plan approval, parallel execution, failure cascade, synthesis

---

## Phase 7: User Story 5 - Dual View Mode (Priority: P2)

**Goal**: User switches between Chat and Terminal view per conversation

**Independent Test**: Run an Agent, switch to Terminal tab to see raw output, switch back without losing position

### Implementation for User Story 5

- [ ] T086 [US5] Implement PTY manager (spawn node-pty per session, stream data) in packages/daemon/src/providers/pty-manager.ts
- [ ] T087 [US5] Add pty_output WebSocket message type and streaming from PTY to WS in packages/daemon/src/ws/pty-stream.ts
- [ ] T088 [US5] Add pty_input WebSocket handler (forward client input to PTY stdin) in packages/daemon/src/ws/pty-stream.ts
- [ ] T089 [P] [US5] Implement terminal component wrapper (xterm.js + addon-fit) in packages/ui/src/components/terminal/terminal-view.tsx
- [ ] T090 [P] [US5] Implement view mode tabs (Chat / Terminal) with scroll position preservation in packages/ui/src/components/chat/view-tabs.tsx
- [ ] T091 [US5] Wire up PTY data flow in WebSocket handler (pty_output → xterm.write, user input → pty_input) in packages/ui/src/services/ws-handler.ts

**Checkpoint**: User can toggle between Chat and Terminal views, terminal shows full ANSI output, user can type commands

---

## Phase 8: User Story 6 - External Session Discovery (Priority: P3)

**Goal**: Argo discovers externally running Agent sessions and shows them as observe-only

**Independent Test**: Start Claude Code externally, verify it appears in Argo sidebar within 10s, confirm observe-only

### Implementation for User Story 6

- [ ] T092 [US6] Implement session discovery poller (scan ~/.claude/sessions/, check PID alive) in packages/daemon/src/discovery/claude-discovery.ts
- [ ] T093 [US6] Implement external session registration (create conversation entry marked external) in packages/daemon/src/discovery/register.ts
- [ ] T094 [P] [US6] Implement external session UI indicator (dashed border, "External" badge, disabled input) in packages/ui/src/components/sidebar/external-badge.tsx
- [ ] T095 [US6] Add sessions API route (list active sessions including external) in packages/daemon/src/api/sessions.ts

**Checkpoint**: External Claude Code sessions auto-appear in sidebar, user can observe but not control

---

## Phase 9: User Story 7 - Custom Agent Creation (Priority: P3)

**Goal**: User creates custom Agents with system prompt and tool configuration

**Independent Test**: Create a custom Agent, verify it appears in Agent picker, use it in a conversation

### Implementation for User Story 7

- [ ] T096 [US7] Implement custom Agent CRUD API (create, update, delete) in packages/daemon/src/api/agents.ts
- [ ] T097 [P] [US7] Implement Agent creation form (name, avatar color, system prompt, tools, model) in packages/ui/src/components/agents/agent-form.tsx
- [ ] T098 [P] [US7] Implement Agent settings/management page in packages/ui/src/pages/agents.tsx
- [ ] T099 [US7] Integrate custom Agents into Agent picker and session spawning in packages/daemon/src/providers/session-manager.ts

**Checkpoint**: User can create, edit, delete custom Agents and use them in conversations

---

## Phase 10: User Story 8 - Inline Web Preview (Priority: P3)

**Goal**: Agent-generated HTML output renders inline as iframe preview cards

**Independent Test**: Have Agent produce HTML, verify iframe preview card renders, test full-screen and device size toggle

### Implementation for User Story 8

- [ ] T100 [P] [US8] Implement preview card component (iframe sandbox, title, size info) in packages/ui/src/components/preview/preview-card.tsx
- [ ] T101 [P] [US8] Implement full-screen preview modal with device size toggle (desktop/tablet/mobile) in packages/ui/src/components/preview/fullscreen-preview.tsx
- [ ] T102 [US8] Detect HTML output in Agent messages and render as preview cards in packages/ui/src/components/chat/message-bubble.tsx

**Checkpoint**: Agent HTML output shows inline iframe preview, full-screen works with device size switching

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T103 [P] Implement Diff view card component (react-diff-viewer, collapse/expand, file name header) in packages/ui/src/components/code/diff-card.tsx
- [ ] T104 [P] Implement message hover toolbar (copy, quote, regenerate actions) in packages/ui/src/components/chat/message-toolbar.tsx
- [ ] T105 [P] Implement message pinning UI and API (pin button, pin indicator, pinned count) in packages/ui/src/components/chat/pin-controls.tsx and packages/daemon/src/api/pins.ts
- [ ] T106 [P] Implement conflict detection and resolution UI for group chat in packages/ui/src/components/orchestrator/conflict-resolver.tsx
- [ ] T107 Implement dark/light theme support with Tailwind CSS in packages/ui/src/lib/theme.ts
- [ ] T108 Add loading skeletons and empty states across all pages in packages/ui/src/components/shared/
- [ ] T109 Implement error boundaries and friendly error messages in packages/ui/src/components/shared/error-boundary.tsx
- [ ] T110 Performance: ensure virtual scroll handles 10,000+ messages without jank in packages/ui/src/components/chat/message-list.tsx
- [ ] T111 Security: validate all API inputs with Zod, sanitize HTML in previews, scope iframe sandbox in packages/daemon/src/api/ and packages/ui/src/components/preview/

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **US1 - Single Chat (Phase 3)**: Depends on Foundational — first MVP deliverable
- **US2 - Conversation Mgmt (Phase 4)**: Depends on Foundational — can parallel with US1
- **US3 - Approval (Phase 5)**: Depends on Foundational + US1 (needs working Agent session)
- **US4 - Group Orchestration (Phase 6)**: Depends on US1 + US3 (needs working chat + approval)
- **US5 - Dual View (Phase 7)**: Depends on US1 (needs active session)
- **US6 - External Sessions (Phase 8)**: Depends on Foundational only
- **US7 - Custom Agents (Phase 9)**: Depends on US1 (needs Agent selection flow)
- **US8 - Web Preview (Phase 10)**: Depends on US1 (needs message rendering)
- **Polish (Phase 11)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Foundational only → MVP
- **US2 (P1)**: Foundational only → can parallel with US1
- **US3 (P1)**: US1 (needs session to trigger approvals)
- **US4 (P2)**: US1 + US3
- **US5 (P2)**: US1
- **US6 (P3)**: Foundational only
- **US7 (P3)**: US1
- **US8 (P3)**: US1

### Within Each User Story

- Models/schemas before services
- Services before API routes
- Daemon implementation before UI
- Core components before integration

### Parallel Opportunities

- T002, T003, T004 (package creation) all in parallel
- T010-T013 (shared schemas) in parallel with T014-T015 (database)
- T024-T030 (UI foundation) in parallel with T016-T023 (daemon foundation)
- US1 and US2 can run in parallel after Foundational
- US6, US7, US8 can all run in parallel after US1

---

## Parallel Example: Phase 2 (Foundational)

```
# Batch 1 (no dependencies):
T010 (NormalizedEvent schemas) | T011 (API schemas) | T012 (constants) | T013 (types)

# Batch 2 (depends on schemas):
T014 (DB schema) | T017 (JWT auth) | T024 (Vite setup) | T025 (Zustand) | T026 (WS client) | T027 (API client)

# Batch 3 (depends on DB + schemas):
T016 (EventBus) | T018 (Hono server) | T019 (WS server) | T028 (auth routes) | T029 (auth pages)

# Batch 4 (depends on EventBus + WS):
T020 (event persist) | T021 (WS broadcast) | T022 (sequence replay) | T030 (auth guard)

# Batch 5:
T023 (daemon entry point)
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1 (Single Agent Chat)
4. **STOP and VALIDATE**: Send a message to Claude Code, see streaming response
5. Complete Phase 4: User Story 2 (Conversation Management)
6. Complete Phase 5: User Story 3 (Operation Approval)
7. **MVP COMPLETE**: Fully functional single-Agent chat with safety controls

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. US1 → Single chat works (first demo!)
3. US2 + US3 → Full P1 experience (production-ready core)
4. US4 → Group orchestration (key differentiator)
5. US5 → Terminal view (power user feature)
6. US6 + US7 + US8 → Polish features (parallel)
7. Phase 11 → Final polish

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Total tasks: 111
