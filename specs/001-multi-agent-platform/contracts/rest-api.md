# REST API Contract

**Base URL**: `http://localhost:54321/api`
**Content-Type**: `application/json`
**Authentication**: Bearer token in `Authorization` header (except auth endpoints)

## Authentication

### POST /api/auth/register
Create a new user account.

**Request**:
```json
{ "email": "user@example.com", "password": "minimum8chars" }
```

**Response** (201):
```json
{ "token": "<jwt>", "user": { "id": "<uuid>", "email": "user@example.com" } }
```

### POST /api/auth/login
Authenticate and receive JWT.

**Request**:
```json
{ "email": "user@example.com", "password": "password" }
```

**Response** (200):
```json
{ "token": "<jwt>", "user": { "id": "<uuid>", "email": "user@example.com" } }
```

---

## Conversations

### GET /api/conversations
List user's conversations (paginated, sorted by updatedAt desc).

**Query params**: `?page=1&limit=20&search=<term>`

**Response** (200):
```json
{
  "conversations": [
    {
      "id": "<uuid>",
      "title": "Chat with Claude",
      "mode": "single",
      "pinned": false,
      "archived": false,
      "agents": [{ "id": "<uuid>", "name": "Claude Code", "avatarColor": "#E87040" }],
      "lastMessage": { "content": "Here's the fix...", "timestamp": "2026-05-21T10:00:00Z" },
      "unreadCount": 2,
      "updatedAt": "2026-05-21T10:00:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

### POST /api/conversations
Create a new conversation.

**Request**:
```json
{
  "mode": "single",
  "agentIds": ["<uuid>"],
  "title": "Optional custom title"
}
```

**Response** (201):
```json
{ "id": "<uuid>", "title": "Claude Code", "mode": "single", "agents": [...] }
```

### PATCH /api/conversations/:id
Update conversation metadata (pin, archive, rename).

**Request**:
```json
{ "pinned": true }
```

### DELETE /api/conversations/:id
Delete a conversation and its events.

---

## Messages

### POST /api/conversations/:id/messages
Send a user message to the conversation (triggers Agent response).

**Request**:
```json
{ "content": "Please fix the login bug", "quotedSequence": null }
```

**Response** (202):
```json
{ "accepted": true, "sessionId": "<uuid>" }
```

### POST /api/conversations/:id/messages/:sequence/regenerate
Regenerate an Agent response from a specific point.

---

## Events

### GET /api/conversations/:id/events
Query conversation events (paginated).

**Query params**: `?afterSequence=0&limit=100`

**Response** (200):
```json
{
  "events": [
    { "sequence": 1, "type": "message", "payload": {...}, "timestamp": "..." }
  ],
  "hasMore": true
}
```

---

## Agents

### GET /api/agents
List all available Agents (built-in + custom).

**Response** (200):
```json
{
  "agents": [
    { "id": "<uuid>", "name": "Claude Code", "type": "claude_code", "avatarColor": "#E87040", "capabilities": ["code", "bash", "files"] },
    { "id": "<uuid>", "name": "Codex", "type": "codex", "avatarColor": "#10B981", "capabilities": ["code", "bash"] }
  ]
}
```

### POST /api/agents
Create a custom Agent.

**Request**:
```json
{
  "name": "My Helper",
  "avatarColor": "#8B5CF6",
  "systemPrompt": "You are a helpful assistant...",
  "capabilities": ["code", "analysis"],
  "config": { "model": "claude-sonnet-4-6" }
}
```

### PUT /api/agents/:id
Update a custom Agent.

### DELETE /api/agents/:id
Delete a custom Agent (only user-created).

---

## Approvals

### POST /api/approvals/:id/decide
Resolve a pending approval.

**Request**:
```json
{ "decision": "approve" }
```

**Response** (200):
```json
{ "approvalId": "<uuid>", "status": "approved", "decidedAt": "..." }
```

### GET /api/approvals/pending
List all pending approvals for the user.

### POST /api/approvals/always-allow
Create an always-allow rule.

**Request**:
```json
{ "toolName": "Write", "pattern": "src/**" }
```

---

## Pinned Messages

### POST /api/conversations/:id/pins
Pin a message.

**Request**:
```json
{ "eventSequenceNumber": 42 }
```

### DELETE /api/conversations/:id/pins/:eventSequence
Unpin a message.

### GET /api/conversations/:id/pins
List pinned messages for a conversation.

---

## Sessions

### GET /api/sessions
List active sessions (including external).

**Response** (200):
```json
{
  "sessions": [
    { "sessionId": "<uuid>", "provider": "claude_code", "status": "running", "isExternal": false, "workspace": "/path" }
  ]
}
```

---

## Error Response Format

All error responses follow:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": [{ "field": "email", "issue": "Invalid format" }]
  }
}
```

| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_ERROR | Request body/params failed validation |
| 401 | UNAUTHORIZED | Missing or invalid JWT |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource doesn't exist |
| 409 | CONFLICT | Resource state conflict |
| 500 | INTERNAL_ERROR | Unexpected server error |
