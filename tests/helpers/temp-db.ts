// A fresh SQLite database per test file, migrated with the real migrations.
// Call before importing anything that touches "@/db/client".
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function createTempDb() {
  const dir = mkdtempSync(join(tmpdir(), "agora-test-"));
  process.env.AGORA_DB = join(dir, "test.db");
  const { getDb } = await import("@/db/client");
  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
  const db = getDb();
  migrate(db, { migrationsFolder: join(process.cwd(), "drizzle") });
  return db;
}
