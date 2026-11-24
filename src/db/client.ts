// One SQLite connection per server process. Kept on globalThis so Next.js dev reloads reuse it.
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { join } from "node:path";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;

export const DB_PATH = process.env.AGORA_DB ?? join(process.cwd(), "data", "agora.db");

export function openDatabase(path: string = DB_PATH): { sqlite: Database.Database; db: Db } {
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  return { sqlite, db: drizzle(sqlite, { schema }) };
}

const globalForDb = globalThis as unknown as { __agoraDb?: Db };

/** The app's database. Throws a clear message when the demo has not been seeded yet. */
export function getDb(): Db {
  if (!globalForDb.__agoraDb) {
    try {
      globalForDb.__agoraDb = openDatabase().db;
    } catch (error) {
      throw new Error(`Could not open ${DB_PATH}. Run \`npm run db:seed\` first.`, { cause: error });
    }
  }
  return globalForDb.__agoraDb;
}
