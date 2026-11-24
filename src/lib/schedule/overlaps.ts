// Overlap rule (DR-03): intervals overlap if a.start < b.end && b.start < a.end.
// Back-to-back sessions do not overlap. Canceled sessions never count.

export type TimedSession = {
  id: string | number;
  startsAt: number; // epoch ms
  endsAt: number; // epoch ms
  canceled?: boolean;
};

export type Overlap<T extends TimedSession> = {
  a: T;
  b: T;
  /** Shared minutes, for "These two overlap by 30 minutes." */
  minutes: number;
};

export function overlaps(a: TimedSession, b: TimedSession): boolean {
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}

export function overlapMinutes(a: TimedSession, b: TimedSession): number {
  const ms = Math.min(a.endsAt, b.endsAt) - Math.max(a.startsAt, b.startsAt);
  return ms > 0 ? Math.round(ms / 60_000) : 0;
}

/** All overlapping pairs, ordered by start time (a starts no later than b). */
export function findOverlaps<T extends TimedSession>(sessions: readonly T[]): Overlap<T>[] {
  const active = sessions
    .filter((s) => !s.canceled)
    .sort((x, y) => x.startsAt - y.startsAt || x.endsAt - y.endsAt || String(x.id).localeCompare(String(y.id)));
  const pairs: Overlap<T>[] = [];
  for (let i = 0; i < active.length; i++) {
    const a = active[i]!;
    for (let j = i + 1; j < active.length; j++) {
      const b = active[j]!;
      if (b.startsAt >= a.endsAt) break; // sorted by start: nothing later can overlap a
      if (overlaps(a, b)) pairs.push({ a, b, minutes: overlapMinutes(a, b) });
    }
  }
  return pairs;
}

/** For each session id, the ids of saved sessions it overlaps with (in start order). */
export function overlapIndex<T extends TimedSession>(sessions: readonly T[]): Map<T["id"], T["id"][]> {
  const index = new Map<T["id"], T["id"][]>();
  for (const { a, b } of findOverlaps(sessions)) {
    index.set(a.id, [...(index.get(a.id) ?? []), b.id]);
    index.set(b.id, [...(index.get(b.id) ?? []), a.id]);
  }
  return index;
}
