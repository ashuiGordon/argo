import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
import Database from "better-sqlite3";
import { initializeSchema } from "./schema.js";
import { Queries } from "./queries.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "../../data/argo.db");

let db: Database.Database | null = null;
let queries: Queries | null = null;

export function getDb(): Database.Database {
  if (!db) {
    mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initializeSchema(db);
  }
  return db;
}

export function getQueries(): Queries {
  if (!queries) {
    queries = new Queries(getDb());
  }
  return queries;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
    queries = null;
  }
}
