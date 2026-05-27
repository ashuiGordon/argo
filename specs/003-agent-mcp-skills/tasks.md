# Tasks: Agent MCP and Skill Configuration

**Input**: Design documents from `/specs/003-agent-mcp-skills/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md

**Tests**: Not explicitly requested — test tasks omitted.

**Organization**: Tasks grouped by user story for independent implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1, US2, US3)
- Paths relative to repository root

---

## Phase 1: Setup

**Purpose**: Define shared types and validation utilities

- [X] T001 [P] Add McpServerConfig and SkillConfig interfaces to packages/shared/src/types/index.ts
- [X] T002 [P] Add RESERVED_SKILL_NAMES constant and validation helpers to packages/shared/src/constants/index.ts
- [X] T003 Extend CreateAgentRequest and UpdateAgentRequest schemas with config.mcpServers and config.skills validation in packages/shared/src/schemas/api.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend validation and storage support that all stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Add MCP/skill config validation logic (uniqueness, reserved names, length limits) in packages/daemon/src/api/agents.ts
- [X] T005 Verify agent CRUD API correctly persists and returns config.mcpServers and config.skills (manual test via curl or api-client)

**Checkpoint**: Foundation ready — agents can be created/updated with MCP and skill configs stored in DB

---

## Phase 3: User Story 1 - Configure MCP Servers for an Agent (Priority: P1) 🎯 MVP

**Goal**: When an agent has MCP servers configured, they are passed to Claude Code via the settings JSON on launch.

**Independent Test**: Configure an MCP server on an agent → start a conversation → verify the settings JSON includes mcpServers.

### Implementation for User Story 1

- [X] T006 [US1] Extend generateHookRelay() to accept mcpServers config and inject into settings JSON in packages/daemon/src/adapters/claude/hook-relay.ts
- [X] T007 [US1] Update launchClaude() to read agent's mcpServers from AdapterConfig and pass to generateHookRelay() in packages/daemon/src/adapters/claude/launcher.ts
- [X] T008 [US1] Extend AdapterConfig interface with mcpServers field in packages/daemon/src/adapters/types.ts
- [X] T009 [US1] Update SessionManager to load agent config and pass mcpServers to AdapterConfig when launching in packages/daemon/src/session/session-manager.ts
- [X] T010 [US1] Update launchCodex() to pass mcpServers in initialize JSON-RPC params in packages/daemon/src/adapters/codex/adapter.ts
- [X] T011 [US1] Update PTY launchers (claude and codex) to include mcpServers in their config in packages/daemon/src/adapters/claude/pty-launcher.ts and packages/daemon/src/adapters/codex/pty-launcher.ts

**Checkpoint**: MCP servers configured on an agent are included in the settings JSON when launching Claude Code, and in initialize params for Codex.

---

## Phase 4: User Story 2 - Configure Custom Skills for an Agent (Priority: P2)

**Goal**: When an agent has skills configured, they are injected into the agent's system prompt on launch.

**Independent Test**: Configure a skill on an agent → start a conversation → verify the system prompt includes the skill definition.

### Implementation for User Story 2

- [X] T012 [US2] Extend AdapterConfig interface with skills field in packages/daemon/src/adapters/types.ts
- [X] T013 [US2] Create buildSkillsPromptSection() helper that formats skills into structured prompt text in packages/daemon/src/adapters/claude/launcher.ts
- [X] T014 [US2] Update launchClaude() to append skills section to system prompt via --append-system-prompt flag in packages/daemon/src/adapters/claude/launcher.ts
- [X] T015 [US2] Update SessionManager to load agent config and pass skills to AdapterConfig when launching in packages/daemon/src/session/session-manager.ts
- [X] T016 [US2] Update launchCodex() to append skills to system prompt or pass in initialize params in packages/daemon/src/adapters/codex/adapter.ts
- [X] T017 [US2] Update PTY launchers to pass skills in their args in packages/daemon/src/adapters/claude/pty-launcher.ts and packages/daemon/src/adapters/codex/pty-launcher.ts

**Checkpoint**: Skills configured on an agent are injected into the system prompt on launch for both providers.

---

## Phase 5: User Story 3 - Manage Configurations via Agent Form UI (Priority: P3)

**Goal**: Users can visually add/edit/remove MCP servers and skills through the agent form.

**Independent Test**: Open agent form → add MCP server + skill → save → reopen form → verify configs display correctly.

### Implementation for User Story 3

- [X] T018 [P] [US3] Create MCP server entry form component in packages/ui/src/components/agents/mcp-server-form.tsx
- [X] T019 [P] [US3] Create skill entry form component in packages/ui/src/components/agents/skill-form.tsx
- [X] T020 [US3] Extend agent-form.tsx with collapsible MCP Servers section using mcp-server-form in packages/ui/src/components/agents/agent-form.tsx
- [X] T021 [US3] Extend agent-form.tsx with collapsible Skills section using skill-form in packages/ui/src/components/agents/agent-form.tsx
- [X] T022 [US3] Add client-side validation (unique names, reserved name check, max lengths) in packages/ui/src/components/agents/agent-form.tsx
- [X] T023 [US3] Update api-client to pass config.mcpServers and config.skills in agent create/update calls in packages/ui/src/services/api-client.ts

**Checkpoint**: Full UI flow works — create agent with MCP + skills, edit, remove entries, validation errors shown.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verification, edge cases, cleanup

- [X] T024 [P] Run pnpm build and fix any type errors across all packages
- [X] T025 [P] Verify MCP server launch failure does not block agent session start (graceful degradation)
- [X] T026 Visually verify agent form with dev-browser (add MCP server, add skill, save, reload)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (shared types must exist)
- **US1 (Phase 3)**: Depends on Phase 2 (config must persist correctly)
- **US2 (Phase 4)**: Depends on Phase 2; can run in parallel with US1
- **US3 (Phase 5)**: Depends on Phase 1 (types) — can run in parallel with US1/US2
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational — no dependency on other stories
- **User Story 2 (P2)**: Depends on Foundational — shares AdapterConfig extension with US1 (T008/T012)
- **User Story 3 (P3)**: Depends on Setup types — independent of backend adapter work

### Parallel Opportunities

- T001, T002 can run in parallel (different files)
- T018, T019 can run in parallel (different UI components)
- US1 and US3 can proceed in parallel (backend vs UI)
- T024, T025 can run in parallel (build vs runtime test)

---

## Parallel Example: User Story 3

```bash
# Launch both form components in parallel:
Task: "Create MCP server entry form component in packages/ui/src/components/agents/mcp-server-form.tsx"
Task: "Create skill entry form component in packages/ui/src/components/agents/skill-form.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (types + validation)
2. Complete Phase 2: Foundational (API stores config correctly)
3. Complete Phase 3: User Story 1 (MCP servers passed to CLI)
4. **STOP and VALIDATE**: Create agent with MCP config via curl, verify settings JSON
5. Continue with US2 + US3

### Incremental Delivery

1. Setup + Foundational → Config storage works
2. Add US1 → MCP servers work end-to-end → MVP!
3. Add US2 → Skills injected into system prompt
4. Add US3 → UI form enables visual management
5. Each story adds value without breaking previous stories

---

## Notes

- No database migration needed — uses existing agent `config` JSON column
- MCP config stored as array in DB, converted to object format for Claude Code settings JSON
- Skills injected via `--append-system-prompt` to avoid conflicting with user-provided `--system-prompt`
- Reserved skill names list from research.md R4
