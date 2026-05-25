import type Database from "better-sqlite3";

export function migrate001SessionExtensions(db: Database.Database): void {
  const tableInfo = db.pragma("table_info(sessions)") as Array<{ name: string }>;
  const existingColumns = new Set(tableInfo.map((c) => c.name));

  if (!existingColumns.has("mode")) {
    db.exec(`ALTER TABLE sessions ADD COLUMN mode TEXT NOT NULL DEFAULT 'headless'`);
  }
  if (!existingColumns.has("last_activity_at")) {
    db.exec(`ALTER TABLE sessions ADD COLUMN last_activity_at TEXT`);
  }
  if (!existingColumns.has("token_usage_json")) {
    db.exec(`ALTER TABLE sessions ADD COLUMN token_usage_json TEXT`);
  }
  if (!existingColumns.has("settings_path")) {
    db.exec(`ALTER TABLE sessions ADD COLUMN settings_path TEXT`);
  }

  const approvalInfo = db.pragma("table_info(approvals)") as Array<{ name: string }>;
  const approvalColumns = new Set(approvalInfo.map((c) => c.name));

  if (!approvalColumns.has("resolved_by")) {
    db.exec(`ALTER TABLE approvals ADD COLUMN resolved_by TEXT`);
  }
  if (!approvalColumns.has("reason")) {
    db.exec(`ALTER TABLE approvals ADD COLUMN reason TEXT`);
  }
}
