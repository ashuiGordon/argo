# NormalizedEvent Contract

All Agent adapters (Claude Code, Codex) emit events conforming to this schema. Events are validated by Zod at runtime.

## Event Types (Discriminated Union)

```typescript
type NormalizedEvent =
  | SessionStartEvent
  | SessionEndEvent
  | MessageEvent
  | ToolUseEvent
  | ToolResultEvent
  | ApprovalRequestEvent
  | ApprovalResolvedEvent
  | TaskStatusEvent
  | ErrorEvent
  | UsageEvent

type RiskLevel = "critical" | "high" | "medium" | "low"
type TaskStatus = "pending" | "blocked" | "in_progress" | "completed" | "failed" | "skipped"
```

## Event Definitions

### session_start
Emitted when an Agent session begins.
```json
{
  "type": "session_start",
  "sessionId": "<uuid>",
  "provider": "claude_code" | "codex",
  "workspace": "/absolute/path",
  "agentId": "<uuid>",
  "conversationId": "<uuid>"
}
```

### session_end
Emitted when an Agent session terminates.
```json
{
  "type": "session_end",
  "sessionId": "<uuid>",
  "exitCode": 0
}
```

### message
Emitted for text output from the Agent.
```json
{
  "type": "message",
  "sessionId": "<uuid>",
  "role": "assistant",
  "content": "Here's the implementation...",
  "streaming": true,
  "final": false
}
```

### tool_use
Emitted when the Agent invokes a tool.
```json
{
  "type": "tool_use",
  "sessionId": "<uuid>",
  "tool": "Bash",
  "input": { "command": "npm test" }
}
```

### tool_result
Emitted when a tool completes execution.
```json
{
  "type": "tool_result",
  "sessionId": "<uuid>",
  "tool": "Bash",
  "output": "All tests passed",
  "success": true
}
```

### approval_request
Emitted when a dangerous operation needs user confirmation.
```json
{
  "type": "approval_request",
  "approvalId": "<uuid>",
  "sessionId": "<uuid>",
  "action": "Bash: rm -rf node_modules",
  "riskLevel": "high",
  "toolName": "Bash",
  "proposedAction": { "command": "rm -rf node_modules" },
  "affectedPaths": ["node_modules/"]
}
```

### approval_resolved
Emitted when user responds to an approval request.
```json
{
  "type": "approval_resolved",
  "approvalId": "<uuid>",
  "decision": "approve" | "deny",
  "decidedBy": "user" | "timeout" | "auto_rule"
}
```

### task_status
Emitted for orchestrator task state changes.
```json
{
  "type": "task_status",
  "sessionId": "<uuid>",
  "taskId": "<uuid>",
  "status": "completed",
  "title": "Implement auth middleware",
  "assignee": "Claude Code",
  "result": { "output": "...", "tokensUsed": 1500 }
}
```

### error
Emitted when an error occurs.
```json
{
  "type": "error",
  "sessionId": "<uuid>",
  "message": "Process crashed unexpectedly",
  "code": "PROCESS_CRASH",
  "recoverable": true
}
```

### usage
Emitted to report token consumption.
```json
{
  "type": "usage",
  "sessionId": "<uuid>",
  "inputTokens": 5000,
  "outputTokens": 1200,
  "cacheReadTokens": 3000,
  "cacheWriteTokens": 500
}
```

## Invariants

1. Every event has a `type` and `sessionId` field
2. Events are emitted in causal order per session
3. A `session_start` always precedes other events for that session
4. A `session_end` is the last event for a terminated session
5. `approval_request` is always followed by exactly one `approval_resolved` for the same `approvalId`
6. `streaming: true` messages may be followed by more message events; `final: true` marks the last chunk
