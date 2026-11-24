// Placeholder until build step 3 (schema, migrations and the STEPPE AI Summit 2027 seed).
import { mkdirSync } from "node:fs";
import { join } from "node:path";

mkdirSync(join(process.cwd(), "data"), { recursive: true });
console.log("Seed data arrives in build step 3. data/ is ready.");
