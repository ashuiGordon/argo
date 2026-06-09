# Argo

Local-first multi-agent programming collaboration platform.

## Tech Stack

- **Frontend:** React 18 + Vite 6 + Zustand + TailwindCSS (packages/ui)
- **Backend:** Hono + Node.js + better-sqlite3 (packages/daemon)
- **Shared:** Zod schemas + TypeScript types (packages/shared)
- **Runtime:** Claude Code SDK / Codex SDK (agent subprocesses)

## Commands

```bash
pnpm dev        # Start daemon + UI
pnpm build      # Build all packages
pnpm test       # Run tests
pnpm typecheck  # Type checking
pnpm lint       # ESLint
pnpm format     # Prettier
```

## Ports

- UI: localhost:5173
- Daemon: localhost:54321
- WebSocket: ws://localhost:54321/ws
