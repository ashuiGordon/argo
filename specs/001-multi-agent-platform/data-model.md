# Data Model: Argo Multi-Agent Collaboration Platform

**Date**: 2026-05-21

## Entities

### User

Represents an authenticated user of the platform.

| Field | Description | Constraints |
|-------|-------------|-------------|
| id | Unique identifier | UUID, primary key |
| email | User's email address | Unique, required, valid email format |
| passwordHash | Bcrypt-hashed password | Required, never exposed |
| createdAt | Account creation timestamp | Auto-set |

**State**: Static (no state transitions)

---

### Agent

Represents an AI Agent that can participate in conversations.

| Field | Description | Constraints |
|-------|-------------|-------------|
| id | Unique identifier | UUID, primary key |
| name | Display name | Required, 1-100 chars |
| type | Agent runtime type | Enum: claude_code, codex, custom |
| avatarColor | Brand color for avatar | Hex color string |
| systemPrompt | Custom system prompt | Optional, text |
| capabilities | List of capability tags | JSON array of strings |
| config | Provider-specific configuration | JSON (workspace path, model, tools) |
| createdAt | Creation timestamp | Auto-set |

**State**: Static (configuration changes are immediate, not state transitions)

---

### Conversation

A communication thread between a User and one or more Agents.

| Field | Description | Constraints |
|-------|-------------|-------------|
| id | Unique identifier | UUID, primary key |
| userId | Owner of the conversation | FK → User.id, required |
| title | Display title | Default: Agent name or "Group Chat" |
| mode | Conversation type | Enum: single, group |
| pinned | Whether conversation is pinned to top | Boolean, default false |
| archived | Whether conversation is archived | Boolean, default false |
| createdAt | Creation timestamp | Auto-set |
| updatedAt | Last activity timestamp | Updated on new events |

**Relationships**:
- Has many Agents (via ConversationAgent join)
- Has many Events (via sessionId mapping)
- Has many PinnedMessages

---

### ConversationAgent

Join table linking conversations to participating Agents.

| Field | Description | Constraints |
|-------|-------------|-------------|
| conversationId | Conversation reference | FK → Conversation.id |
| agentId | Agent reference | FK → Agent.id |

**Constraints**: Composite primary key (conversationId, agentId)

---

### Event

An immutable record of activity within a conversation. The single source of truth.

| Field | Description | Constraints |
|-------|-------------|-------------|
| sequenceNumber | Global ordering key | Auto-increment integer, primary key |
| sessionId | Agent session this event belongs to | Required, indexed |
| type | Event discriminator | Enum: session_start, session_end, message, tool_use, tool_result, approval_request, approval_resolved, task_status, error, usage |
| payload | Event-specific data | JSON, validated by Zod per type |
| timestamp | When event occurred | Auto-set |

**Constraints**: Append-only (no updates or deletes). sequenceNumber provides total ordering for replay.

---

### Approval

A pending or resolved decision about a risky Agent operation.

| Field | Description | Constraints |
|-------|-------------|-------------|
| approvalId | Unique identifier | UUID, primary key |
| sessionId | Agent session that triggered approval | Required |
| status | Current resolution state | Enum: pending, approved, denied, timeout |
| actionType | Tool/command being approved | Required string |
| riskLevel | Assessed danger level | Enum: critical, high, medium, low |
| proposedAction | Full details of operation | JSON (command, args, description) |
| affectedPaths | Files/resources affected | JSON array, optional |
| createdAt | When approval was requested | Auto-set |
| decidedAt | When user made decision | Set on resolution |

**State Transitions**:
```
pending → approved (user clicks Approve)
pending → denied (user clicks Deny)
pending → timeout (60s elapsed)
```

---

### AlwaysAllowRule

A user-configured rule to auto-approve specific operation types.

| Field | Description | Constraints |
|-------|-------------|-------------|
| id | Unique identifier | Auto-increment integer |
| userId | Rule owner | FK → User.id |
| toolName | Tool this rule applies to | Required string |
| pattern | Optional pattern match (e.g., path glob) | Optional string |
| createdAt | When rule was created | Auto-set |

---

### PinnedMessage

A reference to an event that should always be included as Agent context.

| Field | Description | Constraints |
|-------|-------------|-------------|
| id | Unique identifier | Auto-increment integer |
| conversationId | Conversation this pin belongs to | FK → Conversation.id |
| eventSequenceNumber | The pinned event | FK → Event.sequenceNumber |
| pinnedAt | When message was pinned | Auto-set |

---

### Session

Runtime mapping between Argo sessions and external Agent CLIs.

| Field | Description | Constraints |
|-------|-------------|-------------|
| sessionId | Argo's UUID for this session | Primary key |
| externalId | Provider's internal session ID | Unique, optional |
| provider | Which Agent runtime | Enum: claude_code, codex |
| conversationId | Linked conversation | FK → Conversation.id |
| workspace | Working directory for the Agent | File path string |
| status | Runtime state | Enum: starting, running, stopped, crashed |
| isExternal | Whether discovered externally | Boolean, default false |
| pid | OS process ID | Optional integer |
| createdAt | Session start time | Auto-set |

**State Transitions**:
```
starting → running (process confirmed alive)
running → stopped (graceful exit)
running → crashed (unexpected exit)
```

---

### Task (Orchestrator)

A unit of work within a group chat orchestration.

| Field | Description | Constraints |
|-------|-------------|-------------|
| id | Unique identifier | UUID |
| conversationId | Group chat this task belongs to | FK → Conversation.id |
| title | Human-readable task title | Required, 1-200 chars |
| description | Detailed task instructions | Required, text |
| assignee | Agent assigned to this task | FK → Agent.id |
| dependsOn | Task IDs this task depends on | JSON array of UUIDs |
| status | Execution state | Enum: pending, blocked, in_progress, completed, failed, skipped |
| result | Execution output (when completed) | JSON (output text, tokens used) |
| error | Failure reason (when failed) | Optional string |
| retryCount | Number of retry attempts | Integer, default 0 |
| maxRetries | Maximum allowed retries | Integer, default 2 |
| createdAt | Task creation time | Auto-set |
| completedAt | Task completion time | Set on terminal state |

**State Transitions**:
```
pending → in_progress (dependencies met, execution starts)
pending → blocked (dependency failed)
in_progress → completed (success)
in_progress → failed (error, may retry)
failed → in_progress (retry attempt)
failed → [terminal] (max retries exceeded)
blocked → failed (cascade from dependency failure)
any non-terminal → skipped (user cancellation)
```

## Relationship Diagram

```
User ─1:N─→ Conversation ─N:M─→ Agent
                │
                ├─1:N─→ Event (append-only)
                ├─1:N─→ PinnedMessage ──→ Event
                ├─1:N─→ Session
                └─1:N─→ Task (orchestrator)

User ─1:N─→ AlwaysAllowRule
Session ─1:N─→ Event
Session ─1:N─→ Approval
```
