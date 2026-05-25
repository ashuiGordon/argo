# API Contracts: Native CLI Integration

**Date**: 2026-05-25 | **Feature**: 002-native-cli-integration

## Session Management API

### POST /api/sessions

Start a new agent session.

**Request**:
```json
{
  "conversationId": "uuid",
  "agentId": "uuid",
  "mode": "headless" | "pty",
  "workspace": "/path/to/workspace"
}
```

**Response** (201):
```json
{
  "sessionId": "uuid",
  "status": "starting",
  "mode": "headless",
  "provider": "claude_code"
}
```

### POST /api/sessions/:id/message

Send a message to an active session.

**Request**:
```json
{
  "content": "user message text"
}
```

**Response** (200):
```json
{
  "accepted": true,
  "turnId": "uuid"
}
```

### POST /api/sessions/:id/resume

Resume a stopped/crashed session.

**Response** (200):
```json
{
  "sessionId": "uuid",
  "status": "running",
  "resumed": true
}
```

### DELETE /api/sessions/:id

Terminate a running session.

**Response** (204): No content

### GET /api/sessions/:id/status

Get current session status and metrics.

**Response** (200):
```json
{
  "sessionId": "uuid",
  "status": "running",
  "mode": "headless",
  "provider": "claude_code",
  "tokenUsage": {
    "inputTokens": 15234,
    "outputTokens": 3421,
    "cachedInputTokens": 12000,
    "totalTokens": 18655,
    "contextUsedTokens": 45000,
    "contextWindowTokens": 200000,
    "contextPercent": 22.5,
    "model": "claude-sonnet-4-6"
  },
  "lastActivityAt": "2026-05-25T10:30:00Z"
}
```

## Approval API

### POST /api/approvals/:id/decide

Resolve a pending approval from the Web UI.

**Request**:
```json
{
  "decision": "approve" | "deny" | "always_allow"
}
```

**Response** (200):
```json
{
  "approvalId": "uuid",
  "decision": "approve",
  "resolvedBy": "web_ui"
}
```

### GET /api/approvals/pending

List all pending approvals for the user's sessions.

**Response** (200):
```json
{
  "approvals": [
    {
      "approvalId": "uuid",
      "sessionId": "uuid",
      "conversationId": "uuid",
      "toolName": "Write",
      "toolInput": {"file_path": "/src/main.ts", "content": "..."},
      "riskLevel": "high",
      "affectedPaths": ["/src/main.ts"],
      "reason": "Writing to source file",
      "createdAt": "2026-05-25T10:30:00Z"
    }
  ]
}
```

## WebSocket Event Stream

### WS /ws/events?sessionId=uuid

Real-time event subscription for a session.

**Server → Client messages**:
```json
{
  "type": "event",
  "data": {
    "schemaVersion": 1,
    "sessionId": "uuid",
    "provider": "claude_code",
    "timestamp": "2026-05-25T10:30:00Z",
    "type": "message",
    "role": "assistant",
    "content": "Here's the implementation...",
    "streaming": false,
    "final": true
  }
}
```

```json
{
  "type": "event",
  "data": {
    "type": "streaming_delta",
    "sessionId": "uuid",
    "provider": "claude_code",
    "timestamp": "2026-05-25T10:30:00Z",
    "delta": "Here's",
    "blockIndex": 0
  }
}
```

```json
{
  "type": "event",
  "data": {
    "type": "approval_request",
    "sessionId": "uuid",
    "provider": "claude_code",
    "timestamp": "2026-05-25T10:30:00Z",
    "approvalId": "uuid",
    "toolName": "Bash",
    "toolInput": {"command": "rm -rf node_modules"},
    "riskLevel": "critical",
    "affectedPaths": ["node_modules/"],
    "reason": "Destructive shell command"
  }
}
```

### WS /ws/pty?sessionId=uuid

PTY data stream for terminal mode.

**Server → Client**: Raw terminal output bytes (binary frames)
**Client → Server**: User input bytes (binary frames)
**Client → Server** (JSON): `{"type": "resize", "cols": 120, "rows": 40}`

## Hook Server Endpoint

### POST /hooks/:sessionId

Receives hook payloads from the relay script. Internal to daemon.

**Request** (from CJS relay script):
```json
{
  "hook_event_name": "PreToolUse",
  "session_id": "claude-session-uuid",
  "tool_name": "Write",
  "tool_input": {
    "file_path": "/src/main.ts",
    "content": "..."
  }
}
```

**Response** (for PreToolUse — blocking):
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow" | "deny",
    "permissionDecisionReason": "optional reason"
  }
}
```

**Response** (for non-blocking hooks):
```json
{
  "ok": true
}
```
