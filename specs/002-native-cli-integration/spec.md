# Feature Specification: Native CLI Integration

**Feature Branch**: `002-native-cli-integration`

**Created**: 2026-05-25

**Status**: Draft

**Input**: User description: "Implement full native CLI integration for Claude Code and Codex following agent-cockpit's proven architecture, replacing simplified adapters with production-grade bidirectional communication."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Multi-Turn Conversation with Claude Code (Priority: P1)

A developer opens Argo, selects Claude Code as the agent, and sends a message. The agent responds. The developer sends follow-up messages continuing the conversation across multiple turns without losing context or restarting the agent process. The conversation flows naturally as if typing directly into the Claude Code CLI.

**Why this priority**: Multi-turn conversation is the fundamental interaction model. Without it, Argo is limited to single-shot queries and cannot support iterative development workflows.

**Independent Test**: Send 3+ sequential messages to a Claude Code agent and verify each response acknowledges prior conversation context. No process restarts should occur between messages.

**Acceptance Scenarios**:

1. **Given** a running Claude Code session, **When** the user sends a second message, **Then** the agent responds with awareness of the first message's context
2. **Given** a running Claude Code session, **When** the user sends 10 consecutive messages, **Then** all responses maintain conversation continuity and no process restart occurs
3. **Given** a running Claude Code session, **When** the agent produces streaming output, **Then** partial results appear in real-time in the UI before the full response completes

---

### User Story 2 - Multi-Turn Conversation with Codex (Priority: P1)

A developer opens Argo, selects Codex as the agent, and engages in a multi-turn conversation. Codex maintains thread state across turns using its native thread lifecycle protocol. The experience is equivalent to using Codex directly.

**Why this priority**: Codex parity is essential for users who rely on Codex for code generation. Both providers must support multi-turn to fulfill the platform's core promise.

**Independent Test**: Start a Codex session, send 3+ messages, and verify thread continuity (responses reference prior context). Verify the thread ID remains constant.

**Acceptance Scenarios**:

1. **Given** an initialized Codex session, **When** the user sends a message, **Then** the message is delivered via the thread lifecycle protocol and response streams back
2. **Given** a Codex thread with history, **When** the user sends a follow-up, **Then** the response demonstrates awareness of all prior turns in the thread
3. **Given** a Codex session, **When** the connection is interrupted and restored, **Then** the session can be resumed from the last known state

---

### User Story 3 - Tool Approval Flow (Priority: P1)

A developer is working with an agent that requests to execute a tool (file write, shell command, etc.). The approval request appears in the Web UI with full context: what tool, what arguments, what files are affected, and the risk level. The developer approves or denies, and the agent proceeds accordingly.

**Why this priority**: Without approval handling, agents cannot execute tools, making them read-only assistants. This is a core safety requirement per the constitution's Approval Sovereignty principle.

**Independent Test**: Trigger a tool execution (e.g., ask agent to write a file), verify the approval card appears with complete details, approve it, and verify the tool executes.

**Acceptance Scenarios**:

1. **Given** an agent attempts a tool execution, **When** the approval request arrives, **Then** the UI displays tool name, arguments, affected paths, and risk classification
2. **Given** a pending approval in the UI, **When** the user clicks "Approve", **Then** the agent receives the approval and proceeds with execution
3. **Given** a pending approval in the UI, **When** the user clicks "Deny", **Then** the agent receives the denial and adjusts its behavior without crashing
4. **Given** a pending approval, **When** the user does not respond within 30 seconds, **Then** the request is auto-denied and the agent is notified

---

### User Story 4 - Interactive Terminal Mode (Priority: P2)

A developer wants the full native terminal experience. They switch to PTY mode for a Claude Code or Codex session, getting a complete terminal with colors, resize support, slash commands, and MCP server access — exactly as if running the CLI directly.

**Why this priority**: PTY mode preserves the power-user experience for developers who want full CLI access. It's critical for advanced workflows (MCP servers, slash commands) but not required for basic chat.

**Independent Test**: Launch an agent in PTY mode, verify terminal output includes colors, resize the terminal window, and use a slash command (e.g., `/help`).

**Acceptance Scenarios**:

1. **Given** the user selects PTY mode, **When** the session starts, **Then** a full terminal interface appears with colored output
2. **Given** a PTY session, **When** the user resizes the browser window, **Then** the terminal dimensions update accordingly
3. **Given** a PTY session with Claude Code, **When** the user types a slash command, **Then** it executes as it would in a native terminal

---

### User Story 5 - Session Resume (Priority: P2)

A developer returns to Argo after closing their browser. They see their previous conversations listed. They select one and resume the conversation where they left off, with full context preserved.

**Why this priority**: Session persistence is essential for real workflows that span hours or days. Without it, developers lose context every time they navigate away.

**Independent Test**: Start a conversation, close the browser tab, reopen Argo, select the conversation, send a message, and verify the agent has full prior context.

**Acceptance Scenarios**:

1. **Given** a previously active Claude Code session, **When** the user returns and sends a message, **Then** the session resumes with full conversation history intact
2. **Given** a previously active Codex thread, **When** the user returns, **Then** the thread resumes from its last state
3. **Given** a session that crashed while the user was away, **When** the user returns, **Then** the UI shows the session status as "crashed" with an option to restart

---

### User Story 6 - Real-Time Observability (Priority: P2)

A developer wants to monitor agent activity, token usage, and cost while the agent works. The UI displays real-time progress including which tools are being used, how many tokens have been consumed, and the context window utilization percentage.

**Why this priority**: Without observability, multi-agent sessions become opaque black boxes. Cost visibility prevents surprise bills; progress visibility builds trust.

**Independent Test**: Start a conversation, trigger tool usage, and verify the UI shows token counts, context percentage, and tool activity in real-time.

**Acceptance Scenarios**:

1. **Given** an active session, **When** the agent produces output, **Then** token usage (input, output, cached) updates in real-time
2. **Given** an active session, **When** the agent uses a tool, **Then** the tool activity appears in the event stream before the tool completes
3. **Given** multiple sessions, **When** viewing the session list, **Then** each session shows its current status (running, idle, crashed)

---

### User Story 7 - Hook-Driven Activity Feed (Priority: P3)

A developer wants detailed visibility into all agent lifecycle events. Every significant action (session start, tool use, permission request, sub-agent spawn) appears in a structured activity feed that can be filtered and searched.

**Why this priority**: Complete hook coverage enables advanced debugging and orchestration workflows. Less critical for basic chat but essential for the platform's long-term value.

**Independent Test**: Start a session that triggers multiple hooks (tool use, permission request), verify all events appear in the feed with correct metadata.

**Acceptance Scenarios**:

1. **Given** a running session, **When** the agent spawns a sub-agent, **Then** SubagentStart and SubagentStop events appear in the activity feed
2. **Given** a running session, **When** the agent requests an elicitation (asks a question), **Then** the Elicitation event appears and the user can respond through the UI

---

### Edge Cases

- What happens when the agent process crashes mid-response? (Session marked as crashed, UI notified, pending approvals cleared)
- What happens when two approval channels (Web UI + terminal) race? (First responder wins, other channel dismisses)
- What happens when the user sends a message while the agent is still responding? (Message queued until current turn completes)
- What happens when the agent binary is not found on PATH? (Graceful error with instructions to install)
- What happens when context window reaches 100%? (Agent handles compression natively; platform surfaces the metric)
- What happens when network drops during a PTY session? (Connection can be re-established; terminal state preserved server-side)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST launch Claude Code with bidirectional stream-json format (`--output-format=stream-json --input-format=stream-json`) enabling multi-turn conversations without process restart
- **FR-002**: System MUST launch Codex using the `app-server` JSON-RPC protocol, performing the full handshake sequence (initialize → initialized → thread/start → turn/start)
- **FR-003**: System MUST support PTY/interactive mode via node-pty for both Claude Code and Codex, preserving colors, resize, slash commands, and MCP server support
- **FR-004**: System MUST inject new user messages into running Claude Code sessions via stdin using the stream-json user turn payload format
- **FR-005**: System MUST send new user messages to running Codex sessions via the `turn/start` JSON-RPC method on the existing thread
- **FR-006**: System MUST register and relay all Claude Code lifecycle hooks (SessionStart, SessionEnd, PreToolUse, PostToolUse, PermissionRequest, PermissionDenied, Elicitation, ElicitationResult, SubagentStart, SubagentStop, Notification, Stop)
- **FR-007**: System MUST surface tool execution approvals through the Web UI with risk classification, affected file paths, tool name, arguments, and reason
- **FR-008**: System MUST support dual-channel approval where decisions can come from either Web UI or terminal (PTY mode), with first-responder semantics
- **FR-009**: System MUST persist session state (Claude session IDs, Codex thread IDs, workspace paths) durably in the database
- **FR-010**: System MUST support session resume: Claude Code via `--resume <session-id>`, Codex via `thread/resume`
- **FR-011**: System MUST produce structured NormalizedEvents for every agent interaction, including token usage (input, output, cached, total), context window metrics, model identification, and timestamps
- **FR-012**: System MUST monitor agent process health (running, idle, crashed, stopped) and update session status accordingly
- **FR-013**: System MUST clean up temporary files (settings JSON, hook relay scripts) on session exit
- **FR-014**: System MUST NOT downgrade CLI capabilities (no `--print` single-shot mode, no `codex exec --ephemeral`) except as an explicit fallback when the full runtime is unavailable
- **FR-015**: System MUST use a hook relay script (Node.js CJS) that POSTs hook payloads to the daemon's hook server endpoint with configurable timeout
- **FR-016**: System MUST support Codex PTY mode via WebSocket proxy architecture: codex app-server (stdio) ↔ WS proxy ↔ codex --remote ws://... (PTY)

### Key Entities

- **Session**: Represents a running agent conversation. Contains session ID, provider type (claude_code/codex), mode (headless/pty), status (running/idle/crashed/stopped), workspace path, and associated conversation ID.
- **NormalizedEvent**: A structured event emitted by any provider. Contains schema version, session ID, provider, timestamp, event type, and type-specific payload.
- **ApprovalRequest**: A pending tool execution requiring user consent. Contains tool name, arguments, affected paths, risk level, and resolution channel.
- **HookPayload**: A lifecycle event from Claude Code's hook system. Contains hook type, session ID, and type-specific data (tool details, permission context, sub-agent info).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can conduct 20+ turn conversations with both Claude Code and Codex without process restart or context loss
- **SC-002**: Agent response streaming begins within 2 seconds of sending a message (no cold-start per message)
- **SC-003**: Tool approval requests appear in the UI within 500ms of the agent requesting them
- **SC-004**: Session resume restores full conversation context within 5 seconds of user return
- **SC-005**: All 12 Claude Code lifecycle hook types are captured and visible in the activity feed
- **SC-006**: Token usage and cost metrics are accurate to within 1% of actual consumption
- **SC-007**: PTY mode terminal renders with equivalent visual fidelity to running the CLI directly (colors, formatting, resize)
- **SC-008**: Agent crash is detected and surfaced to the user within 3 seconds of process exit
- **SC-009**: Dual-channel approval resolves correctly 100% of the time (no duplicate approvals, no orphaned requests)
- **SC-010**: Platform supports at least 5 concurrent agent sessions per user without degradation

## Assumptions

- Claude Code CLI binary is installed and available on the system PATH (or at a user-configured path)
- Codex CLI binary is installed and available on the system PATH (or at a user-configured path)
- The system has node-pty compatible native build toolchain available (node-gyp)
- Users have valid API keys configured for Claude Code and/or Codex
- The existing Argo database schema can be extended to store session state without migration conflicts
- WebSocket support is available in the deployment environment (for PTY proxy)
- The daemon process has permission to spawn child processes and bind to local network ports
- Claude Code's `--output-format=stream-json` and `--input-format=stream-json` flags remain stable in future CLI versions
- Codex's `app-server` JSON-RPC protocol remains stable in future CLI versions
