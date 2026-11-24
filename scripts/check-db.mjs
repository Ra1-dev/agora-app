#!/usr/bin/env node
// Runs before `npm run dev`: syncs brand assets and reminds to seed when the database is missing.
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import "./sync-assets.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
if (!existsSync(join(root, "data", "agora.db"))) {
  console.warn("\n  No database yet. Run `npm run db:seed` to create data/agora.db with the demo event.\n");
}
