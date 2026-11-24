// Seeded PRNG so `npm run db:seed` always builds the same demo data.

export type Rng = () => number;

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const int = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1));

export function pick<T>(rng: Rng, items: readonly T[]): T {
  const item = items[Math.floor(rng() * items.length)];
  if (item === undefined) throw new Error("pick from empty list");
  return item;
}

/** Picks `count` distinct items, each chosen with probability proportional to its weight. */
export function weightedSample<T>(rng: Rng, items: readonly T[], weight: (item: T) => number, count: number): T[] {
  const pool = items.map((item) => ({ item, w: Math.max(0, weight(item)) }));
  const out: T[] = [];
  while (out.length < count && pool.length > 0) {
    const total = pool.reduce((s, p) => s + p.w, 0);
    if (total <= 0) break;
    let r = rng() * total;
    const index = pool.findIndex((p) => (r -= p.w) <= 0);
    const [chosen] = pool.splice(index === -1 ? pool.length - 1 : index, 1);
    if (chosen) out.push(chosen.item);
  }
  return out;
}
