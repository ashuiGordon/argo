import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "../../data/argo.db");

export function createDatabase(dbPath: string = DB_PATH): Database.Database {
  const dir = path.dirname(dbPath);
  import("node:fs").then((fs) => fs.mkdirSync(dir, { recursive: true }));
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

export function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('claude_code', 'codex', 'custom')),
      avatar_color TEXT NOT NULL DEFAULT '#6B7280',
      avatar_url TEXT,
      system_prompt TEXT,
      role TEXT,
      model TEXT,
      disallowed_tools TEXT,
      capabilities TEXT NOT NULL DEFAULT '[]',
      config TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      mode TEXT NOT NULL CHECK(mode IN ('single', 'group')) DEFAULT 'single',
      workspace TEXT,
      team_preset TEXT,
      pinned INTEGER NOT NULL DEFAULT 0,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversation_agents (
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      PRIMARY KEY (conversation_id, agent_id)
    );

    CREATE TABLE IF NOT EXISTS events (
      sequence_number INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
    CREATE INDEX IF NOT EXISTS idx_events_conversation ON events(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_events_conv_seq ON events(conversation_id, sequence_number);

    CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,
      provider TEXT NOT NULL CHECK(provider IN ('claude_code', 'codex')),
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      workspace TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('starting', 'running', 'stopped', 'crashed')) DEFAULT 'starting',
      pid INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS approvals (
      approval_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'denied', 'timeout')) DEFAULT 'pending',
      action_type TEXT NOT NULL,
      risk_level TEXT NOT NULL CHECK(risk_level IN ('critical', 'high', 'medium', 'low')),
      proposed_action TEXT NOT NULL DEFAULT '{}',
      affected_paths TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      decided_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_approvals_session ON approvals(session_id);
    CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);

    CREATE TABLE IF NOT EXISTS always_allow_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tool_name TEXT NOT NULL,
      pattern TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pinned_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      event_sequence_number INTEGER NOT NULL REFERENCES events(sequence_number) ON DELETE CASCADE,
      pinned_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      assignee TEXT NOT NULL REFERENCES agents(id),
      depends_on TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL CHECK(status IN ('pending', 'blocked', 'in_progress', 'completed', 'failed', 'skipped')) DEFAULT 'pending',
      result TEXT,
      error TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 2,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_conversation ON tasks(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

    CREATE TABLE IF NOT EXISTS conversation_reads (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      last_read_sequence INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, conversation_id)
    );

    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      session_id TEXT,
      type TEXT NOT NULL CHECK(type IN ('summary', 'observation', 'decision')),
      content TEXT NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      token_estimate INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_memories_conv_type ON memories(conversation_id, type);
    CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at DESC);

    CREATE TABLE IF NOT EXISTS deployments (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      session_id TEXT,
      type TEXT NOT NULL CHECK(type IN ('preview', 'static', 'container', 'package')),
      status TEXT NOT NULL CHECK(status IN ('pending', 'building', 'deployed', 'failed', 'cancelled')) DEFAULT 'pending',
      target TEXT NOT NULL,
      url TEXT,
      workspace TEXT NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_deployments_conversation ON deployments(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
  `);

  // Migrations for existing databases
  const cols = db.prepare("PRAGMA table_info(conversations)").all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === "workspace")) {
    db.exec("ALTER TABLE conversations ADD COLUMN workspace TEXT");
  }
  if (!cols.some((c) => c.name === "moderator_agent_id")) {
    db.exec("ALTER TABLE conversations ADD COLUMN moderator_agent_id TEXT REFERENCES agents(id)");
  }
  if (!cols.some((c) => c.name === "team_preset")) {
    db.exec("ALTER TABLE conversations ADD COLUMN team_preset TEXT");
  }

  const agentCols = db.prepare("PRAGMA table_info(agents)").all() as Array<{ name: string }>;
  if (!agentCols.some((c) => c.name === "role")) {
    db.exec("ALTER TABLE agents ADD COLUMN role TEXT");
  }
  if (!agentCols.some((c) => c.name === "model")) {
    db.exec("ALTER TABLE agents ADD COLUMN model TEXT");
  }
  if (!agentCols.some((c) => c.name === "disallowed_tools")) {
    db.exec("ALTER TABLE agents ADD COLUMN disallowed_tools TEXT");
  }
  if (!agentCols.some((c) => c.name === "avatar_url")) {
    db.exec("ALTER TABLE agents ADD COLUMN avatar_url TEXT");
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const db = createDatabase();
  initializeSchema(db);
  db.close();
  console.log(`Database initialized at ${DB_PATH}`);
}
