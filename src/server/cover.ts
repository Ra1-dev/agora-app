// The generated default cover (design-decisions §7), inlined so it can scale like a background.
// The event name is drawn in HTML on top (Forum from the page), so the SVG's own text is removed.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const cache = new Map<string, string | null>();

export function generatedCover(slug: string, theme: "light" | "dark", format: "wide" | "square" = "wide"): string | null {
  const key = `${slug}/${theme}-${format}`;
  if (cache.has(key)) return cache.get(key)!;
  let svg: string | null = null;
  try {
    const raw = readFileSync(join(process.cwd(), "public", "covers", slug, `${theme}-${format}.svg`), "utf8");
    const prefix = `cv-${theme}-`;
    svg = raw
      .replace(/<text[\s\S]*?<\/text>/g, "")
      // Unique ids: both theme variants live in the same document.
      .replace(/id="([^"]+)"/g, `id="${prefix}$1"`)
      .replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`)
      .replace(/<svg([^>]*?)\swidth="[^"]*"/, "<svg$1")
      .replace(/<svg([^>]*?)\sheight="[^"]*"/, "<svg$1")
      .replace(/<svg([^>]*?)\srole="img" aria-label="[^"]*"/, "<svg$1")
      .replace(/<svg /, '<svg aria-hidden="true" focusable="false" preserveAspectRatio="xMaxYMid slice" ');
  } catch {
    svg = null; // Not generated yet: `npm run db:seed` writes it.
  }
  cache.set(key, svg);
  return svg;
}
