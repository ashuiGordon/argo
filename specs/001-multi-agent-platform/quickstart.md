# Quickstart: Argo Multi-Agent Collaboration Platform

## Prerequisites

- Node.js 22+
- pnpm 9+
- Claude Code CLI (for Claude Code Agent)
- Codex CLI (for Codex Agent, optional)

## Setup

```bash
# Clone and install
git clone <repo-url> argo
cd argo
pnpm install

# Initialize database (auto-creates SQLite file)
pnpm --filter daemon run db:init

# Start development (daemon + UI with HMR)
pnpm dev
```

## Development Ports

| Service | Port | URL |
|---------|------|-----|
| Argo Daemon (REST + WS) | 54321 | http://localhost:54321 |
| Hook Server | 54322 | http://localhost:54322 |
| Vite Dev Server (UI) | 5173 | http://localhost:5173 |

## First Run

1. Open http://localhost:5173 in your browser
2. Register a new account (email + password)
3. Click "New Conversation" → select an Agent (Claude Code or Codex)
4. Send a message — the Agent will respond in real-time
5. Switch to Terminal view tab to see raw CLI output

## Project Scripts

```bash
pnpm dev           # Start all services in dev mode
pnpm build         # Build all packages for production
pnpm test          # Run all tests
pnpm typecheck     # Run TypeScript type checking
pnpm lint          # Run ESLint
```

## Package Scripts

```bash
pnpm --filter daemon dev     # Start daemon only
pnpm --filter ui dev         # Start UI dev server only
pnpm --filter shared build   # Build shared types
```

## Architecture Overview

```
Browser (React SPA) ←→ WebSocket + REST ←→ Daemon (Node.js)
                                                ├── Claude Code CLI (via Hooks)
                                                └── Codex CLI (via JSON-RPC)
```

The daemon is the central coordinator: it spawns Agent CLI processes, normalizes their output into a unified event stream, persists events to SQLite, and broadcasts them to connected clients via WebSocket.
