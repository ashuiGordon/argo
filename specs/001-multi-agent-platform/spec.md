# Feature Specification: Argo Multi-Agent Collaboration Platform

**Feature Branch**: `001-multi-agent-platform`

**Created**: 2026-05-21

**Status**: Draft

**Input**: User description: "Argo is a multi-Agent collaboration platform with IM chat as the core interaction paradigm. Users interact with multiple AI Agents through conversations, supporting single chat, group chat collaboration, task decomposition and scheduling, operation approval, and inline preview of Agent outputs."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Single Agent Chat (Priority: P1)

A user opens Argo and creates a new one-on-one conversation with an AI Agent. They send a message describing a task, and the Agent responds in real-time with streaming text output. The user can see the response building token by token, copy code blocks from the response, and continue the conversation naturally.

**Why this priority**: The single chat experience is the fundamental interaction unit. Without a fluid 1v1 chat, no other feature (group chat, orchestration) can function.

**Independent Test**: Can be fully tested by creating a conversation with one Agent, sending a message, and verifying real-time streaming response is displayed correctly.

**Acceptance Scenarios**:

1. **Given** a user is on the main page, **When** they click "New Conversation" and select an Agent, **Then** a new conversation is created and the chat window is displayed with the Agent's identity visible.
2. **Given** a user is in a conversation, **When** they type a message and press Enter, **Then** the message appears in the chat as a user bubble and the Agent begins responding with streaming output.
3. **Given** an Agent is responding, **When** the response is in progress, **Then** a "typing" indicator is shown and text appears incrementally.
4. **Given** an Agent response contains code blocks, **When** the response is fully rendered, **Then** code blocks are syntax-highlighted with a copy button.

---

### User Story 2 - Conversation Management (Priority: P1)

A user has multiple ongoing conversations with different Agents. They use the sidebar to switch between conversations, search for a specific conversation, pin important ones to the top, and archive completed ones. Each conversation shows the last message preview and timestamp.

**Why this priority**: Users need to manage multiple parallel workflows. Without conversation management, the platform becomes unusable beyond a single session.

**Independent Test**: Can be tested by creating multiple conversations, verifying sidebar displays them sorted by activity, and testing pin/archive/search operations.

**Acceptance Scenarios**:

1. **Given** a user has 5+ conversations, **When** they view the sidebar, **Then** conversations are listed by most recent activity with Agent avatar, name, last message preview, and timestamp.
2. **Given** a user searches for a conversation, **When** they type a query, **Then** matching conversations are filtered by name or Agent name.
3. **Given** a user right-clicks a conversation, **When** they select "Pin", **Then** the conversation moves to a pinned section at the top.
4. **Given** a conversation has new Agent messages, **When** the user is viewing another conversation, **Then** an unread badge count is displayed on the conversation item.

---

### User Story 3 - Operation Approval (Priority: P1)

An Agent attempts to perform a potentially destructive operation (e.g., executing a shell command, deleting a file). The system intercepts this action, displays an approval card in the chat showing the operation details and risk level, and waits for the user to approve or deny before the Agent proceeds.

**Why this priority**: User safety and control over destructive actions is essential for trust. Without approval gates, users cannot safely delegate tasks to Agents.

**Independent Test**: Can be tested by triggering a risky Agent action and verifying the approval card appears, blocks execution until decision, and correctly resumes or aborts based on choice.

**Acceptance Scenarios**:

1. **Given** an Agent attempts a high-risk operation, **When** the operation is intercepted, **Then** an approval card appears in chat showing the operation content, affected files, and risk level badge (color-coded).
2. **Given** an approval card is displayed, **When** the user clicks "Approve", **Then** the Agent proceeds with the operation and a success confirmation is shown.
3. **Given** an approval card is displayed, **When** the user clicks "Deny", **Then** the Agent is notified the operation was rejected and adjusts its behavior.
4. **Given** a low-risk operation (read-only tools), **When** the Agent uses it, **Then** it is automatically approved without user intervention.
5. **Given** no user response within 60 seconds, **When** the timeout expires, **Then** the operation is automatically denied and the user is notified.

---

### User Story 4 - Group Chat with Task Orchestration (Priority: P2)

A user creates a group conversation with multiple Agents. They describe a complex goal, and the system automatically breaks it down into sub-tasks, assigns each to the most appropriate Agent, executes them in parallel where possible, and presents a synthesized summary when all tasks complete.

**Why this priority**: Group orchestration is the key differentiator of Argo (the "crew on one ship" metaphor). It requires single chat to work first but delivers the platform's unique value.

**Independent Test**: Can be tested by creating a group chat, sending a complex goal, verifying task decomposition is displayed, approving the plan, and checking parallel execution with a final summary.

**Acceptance Scenarios**:

1. **Given** a user creates a group chat with 3 Agents, **When** they send a complex request, **Then** the Orchestrator displays a task breakdown showing each sub-task, its assignee, and dependency relationships.
2. **Given** a task plan is displayed, **When** the user approves it, **Then** tasks without dependencies begin executing in parallel.
3. **Given** tasks are executing, **When** a task completes, **Then** its dependent tasks are unblocked and begin execution automatically.
4. **Given** all tasks are complete, **When** the Orchestrator synthesizes results, **Then** a coherent summary message is posted to the group chat.
5. **Given** a task fails, **When** it has dependent tasks, **Then** all downstream dependents are marked as failed without blocking unrelated tasks.

---

### User Story 5 - Dual View Mode (Priority: P2)

A user wants to see the raw terminal output of an Agent alongside the structured chat view. They switch to "Terminal" mode via a tab at the top of the conversation, seeing the full CLI output in a terminal emulator. They can switch back to "Chat" mode at any time without losing scroll position in either view.

**Why this priority**: Power users need raw output for debugging and understanding Agent behavior. This provides transparency without cluttering the default chat experience.

**Independent Test**: Can be tested by running an Agent, switching between Chat and Terminal tabs, verifying each view renders correctly and preserves scroll position.

**Acceptance Scenarios**:

1. **Given** a conversation is active, **When** the user clicks the "Terminal" tab, **Then** a terminal view renders the Agent's raw CLI output with full ANSI color support.
2. **Given** the user is in Terminal view, **When** they switch to "Chat" tab, **Then** the chat view shows structured messages and the terminal view preserves its scroll position.
3. **Given** the user is in Terminal view, **When** they type a command, **Then** the input is sent directly to the Agent's CLI stdin.

---

### User Story 6 - External Session Discovery (Priority: P3)

A user has Agent sessions running outside of Argo (e.g., Claude Code in a terminal). Argo automatically discovers these sessions and shows them in the conversation list with an "External" badge. The user can observe the session's activity but cannot send messages or terminate it.

**Why this priority**: Users who already use Agent CLIs directly need visibility into those sessions from Argo without disrupting their workflow.

**Independent Test**: Can be tested by running a Claude Code session externally, verifying it appears in Argo's sidebar within the polling interval, and confirming observe-only access.

**Acceptance Scenarios**:

1. **Given** a Claude Code session is running externally, **When** Argo's polling cycle detects it, **Then** the session appears in the conversation list with a dashed border and "External" badge.
2. **Given** an external session is visible, **When** the user opens it, **Then** they can observe the session's events but the input box is disabled.
3. **Given** an external session has ended, **When** Argo detects the process is no longer alive, **Then** the session is marked as ended and can be dismissed from the list.

---

### User Story 7 - Custom Agent Creation (Priority: P3)

A user wants to create their own specialized Agent with a custom system prompt and selected tool set. They access a creation form, configure the Agent's personality and capabilities, and the new Agent appears alongside built-in Agents in the selection panel.

**Why this priority**: Customization allows users to tailor the platform to specific workflows, but requires the core Agent interaction to be solid first.

**Independent Test**: Can be tested by creating a custom Agent with specific prompt/tools, verifying it appears in the Agent list, and using it in a conversation.

**Acceptance Scenarios**:

1. **Given** a user accesses Agent settings, **When** they click "Create Agent", **Then** a form appears with fields for name, avatar, system prompt, tool selection, and model.
2. **Given** a custom Agent is created, **When** the user views the Agent selection panel, **Then** the custom Agent appears alongside built-in Agents.
3. **Given** a custom Agent exists, **When** the user edits or deletes it, **Then** changes take effect immediately in all future conversations.

---

### User Story 8 - Inline Web Preview (Priority: P3)

An Agent generates HTML or a web page as output. The user sees an inline preview card in the chat that renders the page in a sandboxed frame. They can expand it to full screen and test it at different device sizes.

**Why this priority**: Visual output preview reduces context switching but is not essential for the core chat and orchestration workflows.

**Independent Test**: Can be tested by having an Agent produce HTML output and verifying an iframe preview card renders inline with expand/resize controls.

**Acceptance Scenarios**:

1. **Given** an Agent produces HTML output, **When** the response is rendered, **Then** a preview card with an embedded iframe displays the rendered page.
2. **Given** a preview card is visible, **When** the user clicks "Full screen", **Then** the preview expands to fill the viewport with device size toggle options.
3. **Given** a full-screen preview is open, **When** the user interacts with the iframe content, **Then** clicks, scrolls, and inputs work as expected.

---

### Edge Cases

- What happens when an Agent CLI process crashes mid-conversation? System should display a friendly error message and attempt automatic restart.
- What happens when WebSocket connection drops during a streaming response? System should buffer missed events, reconnect, and replay from last seen sequence number.
- What happens when multiple Agents edit the same file in a group chat? System should detect the conflict, display a diff comparison, and let the user choose which version to keep.
- What happens when a user creates a group chat but sends a simple message? System should short-circuit orchestration and route directly to the most appropriate Agent.
- What happens when an approval request times out while the user is away? The operation is auto-denied and the Agent is notified to proceed without that action.
- What happens when an external session is discovered but the Agent type is unknown? The session is shown with a generic icon and limited metadata.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a sidebar conversation list sorted by most recent activity, showing Agent avatar, name, last message preview, and timestamp.
- **FR-002**: System MUST allow users to create single-Agent conversations (1v1 chat) or multi-Agent conversations (group chat).
- **FR-003**: System MUST support real-time streaming output from Agents, rendering responses incrementally as they are generated.
- **FR-004**: System MUST intercept dangerous Agent operations and present them as approval requests with risk level classification (Critical/High/Medium/Low).
- **FR-005**: System MUST automatically approve low-risk operations (read-only tools) without user intervention.
- **FR-006**: System MUST block Agent execution on pending approval requests until user decides or timeout occurs (60 seconds).
- **FR-007**: System MUST support "Always Allow" rules where users can permanently auto-approve specific operation types.
- **FR-008**: System MUST provide dual view modes per conversation: structured Chat view and raw Terminal view.
- **FR-009**: System MUST support syntax highlighting for code blocks in Agent responses across major programming languages.
- **FR-010**: System MUST render file modifications as diff view cards (additions in green, deletions in red) with collapse/expand.
- **FR-011**: System MUST support group chat with automatic task decomposition into a dependency graph (DAG).
- **FR-012**: System MUST execute independent tasks in parallel and respect dependency ordering for dependent tasks.
- **FR-013**: System MUST present the task decomposition plan to the user for approval before execution begins.
- **FR-014**: System MUST cascade task failures to all transitive dependents without blocking unrelated task branches.
- **FR-015**: System MUST synthesize all completed task results into a coherent summary message after orchestration completes.
- **FR-016**: System MUST detect conflicts when multiple Agents modify the same resource and present resolution options.
- **FR-017**: System MUST discover externally running Agent sessions via local filesystem polling and display them as observe-only entries.
- **FR-018**: System MUST persist all conversation messages and events across user sessions.
- **FR-019**: System MUST support real-time communication with sequence-number-based event replay on reconnection.
- **FR-020**: System MUST support message pinning where pinned messages are always included as context when communicating with Agents.
- **FR-021**: System MUST support user authentication (registration, login, logout) to isolate user data.
- **FR-022**: System MUST allow users to create custom Agents with configurable system prompt, tool set, and model selection.
- **FR-023**: System MUST support message operations (copy, quote, regenerate) via hover toolbar.
- **FR-024**: System MUST render Agent-generated web pages as inline iframe preview cards with full-screen expansion.
- **FR-025**: System MUST short-circuit orchestration for simple goals (< 200 characters, no collaboration keywords) by routing directly to the best-matched Agent.
- **FR-026**: System MUST support user cancellation of in-progress orchestration, marking remaining tasks as skipped.

### Key Entities

- **User**: A person who uses the platform. Has credentials, owns conversations and custom Agents.
- **Agent**: An AI entity that performs tasks. Can be built-in (Claude Code, Codex) or user-created. Has a name, capabilities, system prompt, and model configuration.
- **Conversation**: A communication thread between a User and one or more Agents. Has a mode (single/group), title, and ordered list of events.
- **Event**: An atomic unit of activity within a conversation (message sent, tool used, approval requested, etc.). Immutable and append-only.
- **Approval**: A pending decision about a risky Agent operation. Has risk level, proposed action details, and resolution status.
- **Task**: A unit of work assigned to an Agent during orchestration. Has title, description, assignee, dependencies, status, and result.
- **Session**: A runtime connection to an Agent CLI process. Can be internal (started by Argo) or external (discovered).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a conversation and receive the first Agent response within 3 seconds.
- **SC-002**: Agent streaming responses are visible to the user with perceived latency under 200ms from generation.
- **SC-003**: Approval requests appear in the chat within 500ms of the Agent triggering the operation.
- **SC-004**: Group chat task decomposition is displayed to the user within 5 seconds of sending the goal.
- **SC-005**: The platform supports 5+ simultaneous conversations without perceived performance degradation.
- **SC-006**: WebSocket reconnection and event catch-up completes within 3 seconds after a connection drop.
- **SC-007**: External Agent sessions are discovered and displayed within 10 seconds of starting.
- **SC-008**: The conversation list with 100+ conversations loads within 500ms.
- **SC-009**: Orchestrator task assignment matches the appropriate Agent at least 80% of the time (measured by user override rate).
- **SC-010**: Users can switch between Chat and Terminal views with no perceptible delay and no data loss.

## Assumptions

- Users have a stable local development environment with Node.js 22+ installed.
- Users have Claude Code CLI and/or Codex CLI installed locally before using those Agent types.
- The platform operates as a local-first single-user application (multi-user collaboration is out of scope).
- Standard web application session-based authentication is sufficient (no SSO/OAuth required for v1).
- Internet connectivity is required for Agent API calls but the platform UI operates locally.
- Mobile and desktop native apps are out of scope; the platform targets modern desktop browsers (minimum 1024px width).
- File upload and attachment features are out of scope for v1 (text and code only).
- The SQLite database runs alongside the application with no external database service required.
- Agent marketplace, billing, and usage limits are out of scope for v1.
