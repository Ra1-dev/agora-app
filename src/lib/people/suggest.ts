// People suggestions (FR-16, DR-05): only participants who opted into networking,
// matched only on interests they made visible. Every suggestion carries its reason.
import { joinList } from "../text";
import type { Profile } from "./visibility";

export type PersonSuggestion = {
  userId: Profile["userId"];
  sharedInterests: string[];
  reason: string;
};

const key = (s: string) => s.trim().toLowerCase();

export function sharedVisibleInterests(viewerInterests: readonly string[], other: Profile): string[] {
  if (!other.networkingOptIn || !other.visibility.interests) return [];
  const theirs = new Set(other.interests.map(key));
  // Keep the viewer's own order and spelling: it is their declaration.
  return viewerInterests.filter((i) => theirs.has(key(i)));
}

export function suggestPeople(input: {
  viewerId: Profile["userId"];
  viewerInterests: readonly string[];
  candidates: readonly Profile[];
  /** People already connected or with a pending request: shown elsewhere, not suggested. */
  excludeIds?: ReadonlySet<Profile["userId"]>;
  limit?: number;
}): PersonSuggestion[] {
  const { viewerId, viewerInterests, candidates, excludeIds, limit = 10 } = input;
  return candidates
    .filter((c) => c.userId !== viewerId && !excludeIds?.has(c.userId))
    .map((c) => ({ profile: c, shared: sharedVisibleInterests(viewerInterests, c) }))
    .filter((m) => m.shared.length > 0)
    .sort((a, b) => b.shared.length - a.shared.length || a.profile.name.localeCompare(b.profile.name))
    .slice(0, limit)
    .map(({ profile, shared }) => ({
      userId: profile.userId,
      sharedInterests: shared,
      reason: `You both follow ${joinList(shared)}.`,
    }));
}
