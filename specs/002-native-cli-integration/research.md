# Research: Native CLI Integration

**Date**: 2026-05-25 | **Feature**: 002-native-cli-integration

## R1: Claude Code Stream-JSON Protocol

**Decision**: Use bidirectional stream-json format with `--output-format=stream-json --input-format=stream-json` flags.

**Rationale**: This is the only protocol that enables multi-turn conversations without process restart. The process remains alive between turns; user messages are injected via stdin as JSON payloads. The reference implementation (agent-cockpit) proves this works reliably.

**Alternatives considered**:
- `--print` mode (current): Single-shot, no session continuity, no streaming — rejected
- MCP protocol: Not supported by Claude Code CLI — rejected

**Key details from reference**:
- Launch args: `claude -p --verbose --output-format=stream-json --input-format=stream-json --include-partial-messages --session-id <id> --settings <file>`
- User turn injection format: `{"type":"user","message":{"role":"user","content":[{"type":"text","text":"..."}]}}`
- Result envelope contains token usage: `inputTokens`, `outputTokens`, `cacheCreationInputTokens`, `cacheReadInputTokens`
- Assistant messages arrive as `{"type":"assistant","message":{...}}` envelopes
- Streaming deltas: `{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":"..."}}}`

## R2: Codex App-Server JSON-RPC Protocol

**Decision**: Use `codex app-server` with JSON-RPC 2.0 over stdio.

**Rationale**: The app-server protocol is the only way to maintain thread state and handle approvals programmatically. The `exec` mode is ephemeral and single-shot.

**Alternatives considered**:
- `codex exec --ephemeral` (current): No session continuity, bypasses approvals — rejected
- Direct API calls: No CLI features (sandbox, tool execution) — rejected

**Key details from reference**:
- Spawn: `codex app-server` with stdio pipes
- Handshake: `initialize` request → wait for response → `initialized` notification
- Thread start: `thread/start` with `{instructions, workspacePath}`
- New messages: `turn/start` with `{threadId, userMessage}`
- Thread resume: `thread/resume` with `{threadId}`
- Approval requests come as server-initiated JSON-RPC requests with methods like `item/commandExecution/requestApproval`
- Approval responses: write `{id: serverRequestId, result: {approved: true/false}}` to stdin

## R3: PTY Mode Architecture

**Decision**: Use node-pty for both providers. Codex additionally requires a WebSocket proxy for dual tapping.

**Rationale**: node-pty preserves full terminal capabilities (colors, resize, slash commands). For Codex PTY, a WS proxy intercepts events while still allowing terminal interaction.

**Alternatives considered**:
- Raw subprocess with ANSI parsing: Lossy, no resize support — rejected
- Screen recording/replay: Too heavy, no interactivity — rejected

**Key details**:
- Claude Code PTY: `node-pty` spawns via login shell (`bash -l -c "claude ..."`) to get correct PATH
- Codex PTY: `codex app-server` (stdio) ↔ WS proxy server (localhost) ↔ `codex --remote ws://127.0.0.1:<port>` (node-pty)
- Resize: `pty.resize(cols, rows)` propagated from UI via WebSocket
- UI integration: xterm.js in frontend connects via WebSocket to daemon PTY proxy

## R4: Hook Relay Mechanism

**Decision**: Generate a Node.js CJS script per session that POSTs hook payloads to the daemon's HTTP hook server.

**Rationale**: Claude Code hooks execute external commands. A per-session CJS script is reliable, supports timeout configuration, and can carry session metadata. CJS (not ESM) because Claude Code's hook runner may not support ESM modules.

**Key details from reference**:
- Script template: `const http = require('http'); ... POST to localhost:<port>/hooks/<session-id>`
- Each hook type (PreToolUse, PostToolUse, etc.) gets registered in the settings JSON
- PreToolUse hook must return a decision within timeout (65s default)
- Other hooks are fire-and-forget (PostToolUse, SessionStart, etc.)
- Settings JSON written to temp dir, path passed via `--settings <path>`

## R5: Dual-Channel Approval Architecture

**Decision**: First-responder semantics with shared approval state. Either Web UI or PTY terminal can resolve; the other is dismissed.

**Rationale**: Users switch between Web UI and terminal. Blocking on one channel while the user is in the other creates friction. First-responder prevents duplicates.

**Key details**:
- Approval state stored in DB with `pending` status
- Web UI resolves via HTTP API (`POST /api/approvals/:id/decide`)
- PTY resolves via terminal keystroke (agent-native approval)
- When one channel resolves, the other's pending state is cleared
- Auto-deny timer (30s) prevents orphaned approvals from blocking agents indefinitely
- For Codex: approval response written to stdin as JSON-RPC result

## R6: Session Persistence and Resume

**Decision**: Store session state in SQLite; resume via `--resume <session-id>` (Claude) and `thread/resume` (Codex).

**Rationale**: Enables users to return to conversations after browser close or process restart.

**Key details**:
- Sessions table extended with: `claude_session_id`, `codex_thread_id`, `mode` (headless/pty), `last_activity_at`
- On daemon restart: detect sessions in `running` state → mark as `crashed`
- Resume flow: user sends message to conversation → check for existing session → if found and resumable, resume instead of creating new

## R7: NormalizedEvent Schema Extension

**Decision**: Extend existing NormalizedEvent type to include token usage, context metrics, and all hook event types.

**Rationale**: The current schema covers basic message/session events. Full observability requires token tracking and hook event coverage.

**New event types needed**:
- `hook_event` — lifecycle hook fired (with hook type and payload)
- `token_usage` — periodic token/context update
- `approval_request` — tool approval needed (already exists)
- `approval_resolved` — approval decided
- `subagent_start` / `subagent_stop` — nested agent lifecycle

## R8: Binary Resolution

**Decision**: Resolve CLI binaries via platform-specific logic (PATH lookup, login shell for PTY, optional config override).

**Rationale**: Binary locations vary by install method (npm global, Homebrew, manual). Login shell resolves PATH correctly for PTY mode.

**Key details**:
- Headless: `which claude` / `which codex` or user-configured path
- PTY: spawn via `bash -l -c "claude ..."` to pick up `.bashrc`/`.zshrc` PATH
- Windows: `.cmd` wrapper detection (future, not immediate priority)
- Graceful error if binary not found: emit `provider_parse_error` event with helpful message
