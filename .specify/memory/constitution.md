<!--
  Sync Impact Report
  ===================
  Version change: 0.0.0 (template) → 1.0.0
  Modified principles: N/A (initial population)
  Added sections:
    - 6 Core Principles (Native CLI Fidelity, Dual-Mode Architecture,
      Approval Sovereignty, Session Continuity, Complete Hook Coverage,
      Observability by Default)
    - Architecture Constraints section
    - Development Workflow section
    - Governance section
  Removed sections: None
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ (Constitution Check aligns)
    - .specify/templates/spec-template.md ✅ (no changes needed)
    - .specify/templates/tasks-template.md ✅ (no changes needed)
  Follow-up TODOs: None
-->

# Argo Constitution

## Core Principles

### I. Native CLI Fidelity

The platform MUST launch Claude Code and Codex with full native capabilities
equivalent to running them directly in a terminal.

- Claude Code MUST use bidirectional `stream-json` format (`--output-format=stream-json`
  and `--input-format=stream-json`) enabling multi-turn conversations without
  process restart.
- Codex MUST use the `app-server` JSON-RPC protocol for thread lifecycle management
  (`initialize` → `initialized` → `thread/start` → `turn/start`).
- PTY-based interactive terminal sessions MUST be available for both providers,
  preserving colors, resize, slash commands, and MCP server support.
- The platform MUST NOT downgrade CLI capabilities (e.g., using `--print` single-shot
  mode or `codex exec --ephemeral`) except as an explicit fallback when the full
  runtime is unavailable.

**Rationale**: Users choose these CLI tools for their full feature sets. A wrapper
that silently removes capabilities erodes trust and limits the platform's utility.

### II. Dual-Mode Architecture

Every agent adapter MUST support two distinct operational modes:

- **Headless/Programmatic Mode**: For automated orchestration with structured event
  parsing. The daemon controls the agent via stdin/stdout protocols and emits
  NormalizedEvents for the UI layer.
- **PTY/Interactive Mode**: Preserves the full native terminal experience using
  `node-pty`. Users can interact directly with the CLI (type commands, use slash
  commands, see colored output, resize the terminal).

Both modes MUST be independently launchable per session. The UI MUST clearly indicate
which mode a session is operating in.

**Rationale**: Headless mode enables multi-agent orchestration and programmatic
control; PTY mode preserves the rich interactive experience developers expect.
Neither alone is sufficient.

### III. Approval Sovereignty

Tool execution approvals MUST be surfaced to the user through the Web UI with full
context:

- Risk classification (critical / high / medium / low)
- Affected file paths
- Proposed action description (tool name, arguments)
- Reason the action is considered risky

The system MUST support dual-channel approval where applicable:
- Web UI approval panel
- Terminal-native approval (in PTY mode)

First-responder semantics MUST prevent duplicate approvals: once decided in one
channel, the other channel MUST be notified and dismiss the pending prompt.

The platform MUST NOT bypass approval systems (no `--dangerously-skip-permissions`
or `--dangerously-bypass-approvals-and-sandbox`) unless the user explicitly enables
a "trust mode" per session.

**Rationale**: Security-sensitive operations require informed human consent. Dual
channels prevent workflow blocking when the user is in either the Web UI or terminal.

### IV. Session Continuity

Agent sessions MUST persist across multiple user turns without process restart:

- Claude Code: The process remains running; new user messages are injected via stdin
  using the `stream-json` user turn payload format.
- Codex: The `app-server` process remains running; new messages use `turn/start`
  JSON-RPC requests on the existing thread.
- Session state (Claude session IDs, Codex thread IDs, workspace paths) MUST be
  durably stored in the database.
- Session resume MUST be supported: Claude Code via `--resume <session-id>`, Codex
  via `thread/resume` JSON-RPC method.

**Rationale**: Restarting the process per message loses conversation context,
wastes tokens re-reading the prompt cache, and breaks the user's mental model of
a continuous conversation.

### V. Complete Hook Coverage

All Claude Code lifecycle hooks MUST be registered and relayed to the event bus:

- `SessionStart` — session initialized
- `SessionEnd` — session terminated
- `PreToolUse` — before tool execution (approval gate)
- `PostToolUse` — after tool execution (result capture)
- `PermissionRequest` — explicit permission prompt
- `PermissionDenied` — user denied a permission
- `Elicitation` — agent asks user a question
- `ElicitationResult` — user answers an elicitation
- `SubagentStart` — nested agent spawned
- `SubagentStop` — nested agent completed
- `Notification` — informational notification
- `Stop` — session stopping signal

Hook relay MUST use an HTTP-based relay script (Node.js CJS) that POST-s the hook
payload to the daemon's hook server endpoint with configurable timeout.

**Rationale**: Partial hook coverage leaves the UI blind to agent activity. Complete
coverage enables real-time progress visualization, debugging, and orchestration.

### VI. Observability by Default

Every agent interaction MUST produce structured NormalizedEvents containing:

- `schemaVersion` — event schema version for forward compatibility
- `sessionId` — which session produced the event
- `provider` — which CLI tool (`claude_code` or `codex`)
- `timestamp` — ISO 8601 timestamp
- `type` — event category (message, tool_use, approval_request, session_start, etc.)

Token usage tracking MUST be included:
- `inputTokens`, `outputTokens`, `totalTokens`, `cachedInputTokens`
- `contextUsedTokens`, `contextWindowTokens`, `contextPercent`
- `model` — which model is active

The platform MUST monitor agent process health (running, crashed, stopped) and
surface cost/performance metrics to the user.

**Rationale**: Without structured observability, multi-agent systems become opaque.
Cost visibility prevents runaway token spend; health monitoring prevents silent
failures.

## Architecture Constraints

- **Process Lifecycle**: Agent processes are long-lived. The daemon MUST NOT spawn
  a new process per user message.
- **Protocol Boundaries**: Claude Code uses line-delimited JSON over stdio; Codex
  uses JSON-RPC 2.0 over stdio. These protocols MUST NOT be mixed or abstracted
  into a lossy common format at the transport layer.
- **PTY Proxy for Codex**: Codex PTY mode MUST use a WebSocket proxy architecture:
  `codex app-server` (stdio) ↔ WS proxy ↔ `codex --remote ws://...` (PTY). This
  enables simultaneous event tapping and terminal interaction.
- **Platform Resolution**: Binary paths MUST be resolved via platform-specific
  logic (PATH lookup, .cmd wrapper detection on Windows, login shell for PTY).
- **Cleanup**: Temporary files (settings JSON, hook relay scripts) MUST be cleaned
  up on session exit.

## Development Workflow

- **Adapter Pattern**: Each CLI provider (Claude Code, Codex) has its own adapter
  directory (`src/adapters/claude/`, `src/adapters/codex/`) with launcher, parser,
  hook handler, and risk classifier modules.
- **Event Normalization**: Raw provider output MUST be parsed into NormalizedEvent
  format before being persisted or broadcast. Provider-specific quirks stay in the
  adapter; downstream consumers see a uniform schema.
- **Testing**: Adapter tests MUST use mock process factories (`procFactory` injection)
  rather than spawning real CLI processes. Integration tests MAY spawn real processes
  against a test workspace.
- **Error Recovery**: If an agent process crashes, the session status MUST update to
  `crashed`, pending approvals MUST be cleared, and the UI MUST be notified. The
  user MAY choose to restart or resume the session.

## Governance

- This constitution supersedes all ad-hoc implementation decisions regarding agent
  integration.
- Amendments require: (1) documented rationale, (2) impact assessment on existing
  adapters, (3) version bump per semantic versioning rules below.
- Versioning: MAJOR for principle removals or incompatible redefinitions, MINOR for
  new principles or material expansions, PATCH for clarifications.
- Compliance review: Every PR touching adapter code MUST be checked against
  principles I–VI. Deviations MUST be justified in the PR description with a
  reference to the specific principle being relaxed and why.

**Version**: 1.0.0 | **Ratified**: 2025-05-25 | **Last Amended**: 2025-05-25
