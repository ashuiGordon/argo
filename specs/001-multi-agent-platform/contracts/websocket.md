# WebSocket Contract

**Protocol**: WebSocket (RFC 6455)
**Endpoint**: `ws://localhost:54321/ws`
**Authentication**: JWT token in query param `?token=<jwt>`

## Connection Lifecycle

### 1. Connect
```
Client → Server: WebSocket upgrade with ?token=<jwt>&lastSeenSequence=<number>
Server → Client: HTTP 101 Upgrade
```

### 2. Catch-up (if lastSeenSequence provided)
```
Server → Client: { type: "event", payload: <NormalizedEvent>, sequence: N }  (repeated)
Server → Client: { type: "catchup_complete", lastSequence: N }
```

### 3. Real-time streaming
```
Server → Client: { type: "event", payload: <NormalizedEvent>, sequence: N }
Server → Client: { type: "pty_output", sessionId: string, data: string }
```

### 4. Client → Server messages
```
Client → Server: { type: "subscribe", conversationId: string }
Client → Server: { type: "unsubscribe", conversationId: string }
Client → Server: { type: "pty_input", sessionId: string, data: string }
```

### 5. Heartbeat
```
Server → Client: ping frame (every 30s)
Client → Server: pong frame (automatic by browser)
```

## Message Frame Schema

```typescript
// Server → Client
type ServerMessage =
  | { type: "event"; payload: NormalizedEvent; sequence: number }
  | { type: "catchup_complete"; lastSequence: number }
  | { type: "pty_output"; sessionId: string; data: string }
  | { type: "error"; message: string; code: string }

// Client → Server
type ClientMessage =
  | { type: "subscribe"; conversationId: string }
  | { type: "unsubscribe"; conversationId: string }
  | { type: "pty_input"; sessionId: string; data: string }
```

## Error Codes

| Code | Description |
|------|-------------|
| `AUTH_FAILED` | Invalid or expired JWT |
| `NOT_FOUND` | Conversation or session not found |
| `RATE_LIMITED` | Too many messages per second |
