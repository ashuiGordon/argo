# Data Model: Native CLI Integration

**Date**: 2026-05-25 | **Feature**: 002-native-cli-integration

## Entity: Session (extended)

Existing `sessions` table extended with new columns for session continuity.

| Field | Type | Description |
|-------|------|-------------|
| session_id | TEXT PK | Internal UUID |
| external_id | TEXT UNIQUE | Claude session ID or Codex thread ID |
| provider | TEXT | `claude_code` or `codex` |
| conversation_id | TEXT FK | Parent conversation |
| workspace | TEXT | Working directory path |
| status | TEXT | `starting` / `running` / `idle` / `stopped` / `crashed` |
| mode | TEXT | `headless` / `pty` |
| pid | INTEGER | OS process ID |
| is_external | INTEGER | Whether session was attached (not spawned) |
| last_activity_at | TEXT | ISO timestamp of last event |
| token_usage_json | TEXT | JSON blob: `{input, output, cached, total, contextUsed, contextWindow}` |
| settings_path | TEXT | Path to temp settings JSON (for cleanup) |
| created_at | TEXT | Creation timestamp |

**State transitions**: `starting` → `running` ↔ `idle` → `stopped` | `crashed`

## Entity: Approval (extended)

Existing `approvals` table, enhanced for dual-channel resolution.

| Field | Type | Description |
|-------|------|-------------|
| approval_id | TEXT PK | UUID |
| session_id | TEXT | Session that triggered the approval |
| conversation_id | TEXT FK | Conversation context |
| status | TEXT | `pending` / `approved` / `denied` / `timeout` |
| action_type | TEXT | Tool name (e.g., `Write`, `Bash`, `Edit`) |
| risk_level | TEXT | `critical` / `high` / `medium` / `low` |
| proposed_action | TEXT | JSON: tool arguments |
| affected_paths | TEXT | JSON array of file paths |
| reason | TEXT | Why the action is considered risky |
| resolved_by | TEXT | `web_ui` / `terminal` / `auto_timeout` |
| created_at | TEXT | When approval was requested |
| decided_at | TEXT | When decision was made |

## Entity: NormalizedEvent (type union)

All events implement a base shape and specialize by `type`.

### Base fields (all events)

| Field | Type | Description |
|-------|------|-------------|
| schemaVersion | number | Always `1` |
| sessionId | string | Owning session |
| provider | string | `claude_code` or `codex` |
| timestamp | string | ISO 8601 |
| type | string | Event discriminator |

### Event types

| Type | Additional fields |
|------|-------------------|
| `session_start` | workspace, agentId, conversationId, mode |
| `session_end` | exitCode |
| `message` | role, content, streaming, final |
| `tool_use` | toolName, toolInput, toolId |
| `tool_result` | toolId, output, isError |
| `approval_request` | approvalId, toolName, toolInput, riskLevel, affectedPaths, reason |
| `approval_resolved` | approvalId, decision, resolvedBy |
| `token_usage` | inputTokens, outputTokens, totalTokens, cachedInputTokens, contextUsedTokens, contextWindowTokens, contextPercent, model |
| `hook_event` | hookType, hookPayload |
| `error` | message, code, recoverable |
| `streaming_delta` | delta, blockIndex |

## Entity: HookPayload (inbound from relay)

| Field | Type | Description |
|-------|------|-------------|
| hook_event_name | string | One of 12 hook types |
| session_id | string | Claude Code session ID |
| tool_name | string | For PreToolUse/PostToolUse |
| tool_input | object | Tool arguments |
| result | object | For PostToolUse (tool output) |

## Relationships

```
User 1──* Conversation 1──* Session 1──* Event
                       1──* Approval
Session.external_id ←→ Claude session_id / Codex thread_id
```
