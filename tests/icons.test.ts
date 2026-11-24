import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ICON_NAMES } from "@/components/icon-names";

const iconsDir = join(process.cwd(), "design", "icons");

describe("icon names", () => {
  it("match the symbols in the approved sprite", () => {
    const sprite = readFileSync(join(iconsDir, "agora-icons.svg"), "utf8");
    const ids = [...sprite.matchAll(/<symbol id="ag-([a-z0-9-]+)"/g)].map((m) => m[1]);
    expect([...ids].sort()).toEqual([...ICON_NAMES].sort());
  });

  it("match the single-icon files", () => {
    const files = readdirSync(iconsDir)
      .filter((f) => f.endsWith(".svg") && f !== "agora-icons.svg")
      .map((f) => f.replace(/\.svg$/, ""));
    expect(files.sort()).toEqual([...ICON_NAMES].sort());
  });
});
