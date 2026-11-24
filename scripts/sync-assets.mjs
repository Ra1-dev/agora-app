#!/usr/bin/env node
// Copies the approved brand files from design/ into public/ so Next.js can serve them.
// design/ stays the single source of truth; public/brand is generated and git-ignored.
import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "public", "brand");

mkdirSync(target, { recursive: true });
cpSync(join(root, "design", "brand"), target, { recursive: true });
