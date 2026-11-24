import { readFileSync } from "node:fs";
import { join } from "node:path";

// The approved sprite is read from design/ at render time (server only) and inlined once,
// so <Icon> can reference symbols with <use href="#ag-…">.
let cached: string | null = null;

function loadSprite(): string {
  if (cached === null) {
    cached = readFileSync(join(process.cwd(), "design", "icons", "agora-icons.svg"), "utf8");
  }
  return cached;
}

export function IconSprite() {
  return <div hidden dangerouslySetInnerHTML={{ __html: loadSprite() }} />;
}
