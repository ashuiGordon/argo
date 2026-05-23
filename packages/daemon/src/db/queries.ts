import Database from "better-sqlite3";

export class Queries {
  constructor(private db: Database.Database) {}

  // Users
  createUser(id: string, email: string, passwordHash: string) {
    return this.db
      .prepare("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)")
      .run(id, email, passwordHash);
  }

  getUserByEmail(email: string) {
    return this.db.prepare("SELECT * FROM users WHERE email = ?").get(email) as
      | { id: string; email: string; password_hash: string; created_at: string }
      | undefined;
  }

  getUserById(id: string) {
    return this.db.prepare("SELECT id, email, created_at FROM users WHERE id = ?").get(id) as
      | { id: string; email: string; created_at: string }
      | undefined;
  }

  // Agents
  createAgent(
    id: string,
    name: string,
    type: string,
    avatarColor: string,
    capabilities: string[],
    config: Record<string, unknown>,
    systemPrompt?: string,
  ) {
    return this.db
      .prepare(
        `INSERT INTO agents (id, name, type, avatar_color, capabilities, config, system_prompt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, name, type, avatarColor, JSON.stringify(capabilities), JSON.stringify(config), systemPrompt ?? null);
  }

  getAgents() {
    return this.db.prepare("SELECT * FROM agents").all() as Array<{
      id: string;
      name: string;
      type: string;
      avatar_color: string;
      system_prompt: string | null;
      capabilities: string;
      config: string;
      created_at: string;
    }>;
  }

  getAgent(id: string) {
    return this.db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as
      | { id: string; name: string; type: string; avatar_color: string; system_prompt: string | null; capabilities: string; config: string }
      | undefined;
  }

  updateAgent(
    id: string,
    updates: { name?: string; avatarColor?: string; systemPrompt?: string; capabilities?: string[]; config?: Record<string, unknown> },
  ) {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.name) { fields.push("name = ?"); values.push(updates.name); }
    if (updates.avatarColor) { fields.push("avatar_color = ?"); values.push(updates.avatarColor); }
    if (updates.systemPrompt !== undefined) { fields.push("system_prompt = ?"); values.push(updates.systemPrompt); }
    if (updates.capabilities) { fields.push("capabilities = ?"); values.push(JSON.stringify(updates.capabilities)); }
    if (updates.config) { fields.push("config = ?"); values.push(JSON.stringify(updates.config)); }

    if (fields.length === 0) return;
    values.push(id);
    return this.db.prepare(`UPDATE agents SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  }

  deleteAgent(id: string) {
    return this.db.prepare("DELETE FROM agents WHERE id = ? AND type = 'custom'").run(id);
  }

  getAgentById(id: string) {
    return this.db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as
      | { id: string; name: string; type: string; avatar_color: string; capabilities: string; config: string }
      | undefined;
  }

  // Conversations
  createConversation(id: string, userId: string, title: string, mode: string) {
    return this.db
      .prepare("INSERT INTO conversations (id, user_id, title, mode) VALUES (?, ?, ?, ?)")
      .run(id, userId, title, mode);
  }

  addConversationAgent(conversationId: string, agentId: string) {
    return this.db
      .prepare("INSERT OR IGNORE INTO conversation_agents (conversation_id, agent_id) VALUES (?, ?)")
      .run(conversationId, agentId);
  }

  getConversations(userId: string, page: number, limit: number, search?: string) {
    const offset = (page - 1) * limit;
    let query = `SELECT c.*, GROUP_CONCAT(ca.agent_id) as agent_ids
                 FROM conversations c
                 LEFT JOIN conversation_agents ca ON ca.conversation_id = c.id
                 WHERE (c.user_id = ? OR EXISTS (SELECT 1 FROM sessions s WHERE s.conversation_id = c.id AND s.is_external = 1))`;
    const params: unknown[] = [userId];

    if (search) {
      query += " AND c.title LIKE ?";
      params.push(`%${search}%`);
    }

    query += " GROUP BY c.id ORDER BY c.pinned DESC, c.updated_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    return this.db.prepare(query).all(...params) as Array<{
      id: string;
      user_id: string;
      title: string;
      mode: string;
      pinned: number;
      archived: number;
      created_at: string;
      updated_at: string;
      agent_ids: string | null;
    }>;
  }

  getConversationCount(userId: string, search?: string): number {
    let query = "SELECT COUNT(*) as count FROM conversations WHERE (user_id = ? OR EXISTS (SELECT 1 FROM sessions s WHERE s.conversation_id = conversations.id AND s.is_external = 1))";
    const params: unknown[] = [userId];
    if (search) {
      query += " AND title LIKE ?";
      params.push(`%${search}%`);
    }
    return (this.db.prepare(query).get(...params) as { count: number }).count;
  }

  getConversation(id: string) {
    return this.db.prepare("SELECT * FROM conversations WHERE id = ?").get(id) as
      | { id: string; user_id: string; title: string; mode: string; pinned: number; archived: number }
      | undefined;
  }

  updateConversation(id: string, updates: { title?: string; pinned?: boolean; archived?: boolean }) {
    const sets: string[] = [];
    const params: unknown[] = [];
    if (updates.title !== undefined) {
      sets.push("title = ?");
      params.push(updates.title);
    }
    if (updates.pinned !== undefined) {
      sets.push("pinned = ?");
      params.push(updates.pinned ? 1 : 0);
    }
    if (updates.archived !== undefined) {
      sets.push("archived = ?");
      params.push(updates.archived ? 1 : 0);
    }
    sets.push("updated_at = datetime('now')");
    params.push(id);
    return this.db.prepare(`UPDATE conversations SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  }

  deleteConversation(id: string) {
    return this.db.prepare("DELETE FROM conversations WHERE id = ?").run(id);
  }

  getConversationAgents(conversationId: string) {
    return this.db
      .prepare(
        `SELECT a.id, a.name, a.avatar_color, a.type, a.system_prompt FROM agents a
         JOIN conversation_agents ca ON ca.agent_id = a.id
         WHERE ca.conversation_id = ?`,
      )
      .all(conversationId) as Array<{ id: string; name: string; avatar_color: string; type: string; system_prompt: string | null }>;
  }

  // Events
  appendEvent(sessionId: string, conversationId: string, type: string, payload: string) {
    const result = this.db
      .prepare("INSERT INTO events (session_id, conversation_id, type, payload) VALUES (?, ?, ?, ?)")
      .run(sessionId, conversationId, type, payload);
    this.db
      .prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?")
      .run(conversationId);
    return result.lastInsertRowid as number;
  }

  getEvents(conversationId: string, afterSequence: number, limit: number) {
    return this.db
      .prepare(
        `SELECT * FROM events WHERE conversation_id = ? AND sequence_number > ? ORDER BY sequence_number ASC LIMIT ?`,
      )
      .all(conversationId, afterSequence, limit) as Array<{
      sequence_number: number;
      session_id: string;
      conversation_id: string;
      type: string;
      payload: string;
      timestamp: string;
    }>;
  }

  getLastEvent(conversationId: string) {
    return this.db
      .prepare(
        "SELECT * FROM events WHERE conversation_id = ? ORDER BY sequence_number DESC LIMIT 1",
      )
      .get(conversationId) as
      | { sequence_number: number; type: string; payload: string; timestamp: string }
      | undefined;
  }

  // Sessions
  createSession(
    sessionId: string,
    provider: string,
    conversationId: string,
    workspace: string,
    pid?: number,
  ) {
    return this.db
      .prepare(
        "INSERT INTO sessions (session_id, provider, conversation_id, workspace, pid) VALUES (?, ?, ?, ?, ?)",
      )
      .run(sessionId, provider, conversationId, workspace, pid ?? null);
  }

  updateSessionStatus(sessionId: string, status: string) {
    return this.db
      .prepare("UPDATE sessions SET status = ? WHERE session_id = ?")
      .run(status, sessionId);
  }

  getSession(sessionId: string) {
    return this.db.prepare("SELECT * FROM sessions WHERE session_id = ?").get(sessionId) as
      | {
          session_id: string;
          provider: string;
          conversation_id: string;
          workspace: string;
          status: string;
          pid: number | null;
        }
      | undefined;
  }

  getActiveSessions() {
    return this.db
      .prepare("SELECT * FROM sessions WHERE status IN ('starting', 'running')")
      .all() as Array<{
      session_id: string;
      provider: string;
      conversation_id: string;
      status: string;
      is_external: number;
      workspace: string;
    }>;
  }

  findSessionByExternalId(externalId: string) {
    return this.db
      .prepare("SELECT * FROM sessions WHERE external_id = ?")
      .get(externalId) as { session_id: string; status: string } | undefined;
  }

  createExternalSession(
    sessionId: string,
    externalId: string,
    provider: string,
    conversationId: string,
    workspace: string,
    pid: number,
  ) {
    return this.db
      .prepare(
        "INSERT INTO sessions (session_id, external_id, provider, conversation_id, workspace, pid, is_external, status) VALUES (?, ?, ?, ?, ?, ?, 1, 'running')",
      )
      .run(sessionId, externalId, provider, conversationId, workspace, pid);
  }

  getUsers() {
    return this.db.prepare("SELECT id, email FROM users").all() as Array<{ id: string; email: string }>;
  }

  // Approvals
  createApproval(
    approvalId: string,
    sessionId: string,
    conversationId: string,
    actionType: string,
    riskLevel: string,
    proposedAction: Record<string, unknown>,
    affectedPaths?: string[],
  ) {
    return this.db
      .prepare(
        `INSERT INTO approvals (approval_id, session_id, conversation_id, action_type, risk_level, proposed_action, affected_paths)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        approvalId,
        sessionId,
        conversationId,
        actionType,
        riskLevel,
        JSON.stringify(proposedAction),
        affectedPaths ? JSON.stringify(affectedPaths) : null,
      );
  }

  resolveApproval(approvalId: string, status: string) {
    return this.db
      .prepare("UPDATE approvals SET status = ?, decided_at = datetime('now') WHERE approval_id = ?")
      .run(status, approvalId);
  }

  getPendingApprovals(conversationId?: string) {
    if (conversationId) {
      return this.db
        .prepare("SELECT * FROM approvals WHERE status = 'pending' AND conversation_id = ?")
        .all(conversationId) as Array<Record<string, unknown>>;
    }
    return this.db
      .prepare("SELECT * FROM approvals WHERE status = 'pending'")
      .all() as Array<Record<string, unknown>>;
  }

  // Always-allow rules
  createAlwaysAllowRule(userId: string, toolName: string, pattern?: string) {
    return this.db
      .prepare("INSERT INTO always_allow_rules (user_id, tool_name, pattern) VALUES (?, ?, ?)")
      .run(userId, toolName, pattern ?? null);
  }

  getAlwaysAllowRules(userId: string) {
    return this.db
      .prepare("SELECT * FROM always_allow_rules WHERE user_id = ?")
      .all(userId) as Array<{ id: number; tool_name: string; pattern: string | null }>;
  }

  checkAlwaysAllow(userId: string, toolName: string): boolean {
    const rule = this.db
      .prepare("SELECT id FROM always_allow_rules WHERE user_id = ? AND tool_name = ? LIMIT 1")
      .get(userId, toolName);
    return !!rule;
  }

  // Unread tracking
  markConversationRead(userId: string, conversationId: string, sequenceNumber: number) {
    return this.db
      .prepare(
        `INSERT INTO conversation_reads (user_id, conversation_id, last_read_sequence)
         VALUES (?, ?, ?)
         ON CONFLICT(user_id, conversation_id) DO UPDATE SET last_read_sequence = excluded.last_read_sequence`,
      )
      .run(userId, conversationId, sequenceNumber);
  }

  getUnreadCount(userId: string, conversationId: string): number {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM events e
         WHERE e.conversation_id = ?
         AND e.sequence_number > COALESCE(
           (SELECT last_read_sequence FROM conversation_reads WHERE user_id = ? AND conversation_id = ?), 0
         )`,
      )
      .get(conversationId, userId, conversationId) as { count: number };
    return row.count;
  }

  pinMessage(conversationId: string, sequenceNumber: number, _userId: string) {
    return this.db
      .prepare("INSERT OR IGNORE INTO pinned_messages (conversation_id, event_sequence_number) VALUES (?, ?)")
      .run(conversationId, sequenceNumber);
  }

  unpinMessage(conversationId: string, sequenceNumber: number) {
    return this.db
      .prepare("DELETE FROM pinned_messages WHERE conversation_id = ? AND event_sequence_number = ?")
      .run(conversationId, sequenceNumber);
  }

  getPinnedMessages(conversationId: string) {
    return this.db
      .prepare("SELECT event_sequence_number, pinned_at FROM pinned_messages WHERE conversation_id = ? ORDER BY pinned_at DESC")
      .all(conversationId) as Array<{ event_sequence_number: number; pinned_at: string }>;
  }
}
