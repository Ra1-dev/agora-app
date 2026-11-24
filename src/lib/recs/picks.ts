// "Picked for you" (FR-14, FR-15, UC-03): content-based ranking with a reason for every pick.
// Reasons use only what the participant declared (interests) or did themselves (saved talks).
import { joinList, plural } from "../text";
import { cosine, textVector, type SessionDoc, type SparseVector, type TfidfIndex } from "./tfidf";

export type PickCandidate = SessionDoc & {
  trackId: string | number;
  speakerIds: readonly (string | number)[];
  startsAt: number;
  endsAt: number;
  canceled: boolean;
  /** Saves by everyone, for the popularity prior. */
  saves: number;
};

export type Pick = {
  sessionId: PickCandidate["id"];
  score: number;
  reason: string;
  /** Declared interests that matched, strongest first (at most two are named). */
  matchedInterests: string[];
  /** The participant's saved talks by a speaker of this session. */
  speakerSaves: number;
};

export type PicksResult =
  | { mode: "interests"; picks: Pick[] }
  /** No usable interests (or nothing matched): popular across tracks (FR-15). */
  | { mode: "popular"; picks: Pick[]; label: string }
  /** No session can be suggested at all. */
  | { mode: "empty"; picks: []; title: string; message: string };

export type PicksInput = {
  sessions: readonly PickCandidate[];
  index: TfidfIndex;
  interests: readonly string[];
  savedIds: ReadonlySet<PickCandidate["id"]>;
  now: number;
  limit?: number;
};

export const MIN_SIMILARITY = 0.05;
export const INTEREST_MATCH_MIN = 0.02;
export const POPULARITY_WEIGHT = 0.1;
export const SPEAKER_WEIGHT = 0.08;
export const DEFAULT_LIMIT = 5;

export const POPULAR_LABEL = "Popular across tracks. Add your interests to get picks made for you.";
export const EMPTY_TITLE = "Nothing to suggest yet";
export const EMPTY_MESSAGE = "Picks appear once the organizer publishes the program.";

/** A session can be suggested if it is not saved, not canceled and has not started. */
function isAvailable(s: PickCandidate, savedIds: ReadonlySet<PickCandidate["id"]>, now: number): boolean {
  return !savedIds.has(s.id) && !s.canceled && s.startsAt > now;
}

function savedTalksBySpeaker(sessions: readonly PickCandidate[], savedIds: ReadonlySet<PickCandidate["id"]>) {
  const counts = new Map<string | number, number>();
  for (const s of sessions) {
    if (!savedIds.has(s.id)) continue;
    for (const sp of s.speakerIds) counts.set(sp, (counts.get(sp) ?? 0) + 1);
  }
  return counts;
}

export function explain(matchedInterests: readonly string[], speakerSaves: number): string {
  const talks = speakerSaves > 0 ? `saved ${plural(speakerSaves, "talk")} by this speaker` : "";
  if (matchedInterests.length === 0) return `Because you ${talks}.`;
  const follow = `follow ${joinList(matchedInterests)}`;
  if (!talks) return `Because you ${follow}.`;
  const sep = matchedInterests.length > 1 ? ", and " : " and ";
  return `Because you ${follow}${sep}${talks}.`;
}

function popular(input: PicksInput, available: PickCandidate[]): PicksResult {
  const limit = input.limit ?? DEFAULT_LIMIT;
  const byTrack = new Map<PickCandidate["trackId"], PickCandidate[]>();
  for (const s of available) byTrack.set(s.trackId, [...(byTrack.get(s.trackId) ?? []), s]);
  const queues = [...byTrack.values()]
    .map((list) => list.sort((a, b) => b.saves - a.saves || a.startsAt - b.startsAt))
    .sort((a, b) => b[0]!.saves - a[0]!.saves || a[0]!.trackName.localeCompare(b[0]!.trackName));

  const picks: Pick[] = [];
  for (let round = 0; picks.length < limit; round++) {
    let added = false;
    for (const queue of queues) {
      const s = queue[round];
      if (!s || picks.length >= limit) continue;
      picks.push({
        sessionId: s.id,
        score: s.saves,
        reason: `Popular in the ${s.trackName} track.`,
        matchedInterests: [],
        speakerSaves: 0,
      });
      added = true;
    }
    if (!added) break;
  }
  return { mode: "popular", picks, label: POPULAR_LABEL };
}

function profileVector(vectors: SparseVector[]): SparseVector {
  const sum: SparseVector = new Map();
  for (const v of vectors) for (const [k, w] of v) sum.set(k, (sum.get(k) ?? 0) + w);
  let norm = 0;
  for (const w of sum.values()) norm += w * w;
  norm = Math.sqrt(norm);
  for (const [k, w] of sum) sum.set(k, w / norm);
  return sum;
}

export function recommend(input: PicksInput): PicksResult {
  const { sessions, index, savedIds, now } = input;
  const limit = input.limit ?? DEFAULT_LIMIT;
  const available = sessions.filter((s) => isAvailable(s, savedIds, now));
  if (available.length === 0) return { mode: "empty", picks: [], title: EMPTY_TITLE, message: EMPTY_MESSAGE };

  // Interests whose words appear somewhere in the program are "usable" (FR-15).
  const interestVectors = input.interests
    .map((label) => ({ label, vector: textVector(index, label) }))
    .filter((i) => i.vector.size > 0);
  if (interestVectors.length === 0) return popular(input, available);

  const profile = profileVector(interestVectors.map((i) => i.vector));
  const speakerSaved = savedTalksBySpeaker(sessions, savedIds);
  const maxSaves = Math.max(1, ...available.map((s) => s.saves));

  const picks: Pick[] = [];
  for (const s of available) {
    const vector = index.vectors.get(s.id);
    if (!vector) continue;
    const similarity = cosine(vector, profile);
    const speakerSaves = Math.max(0, ...s.speakerIds.map((sp) => speakerSaved.get(sp) ?? 0));
    if (similarity < MIN_SIMILARITY && speakerSaves === 0) continue;

    const matchedInterests = interestVectors
      .map((i) => ({ label: i.label, value: cosine(vector, i.vector) }))
      .filter((m) => m.value >= INTEREST_MATCH_MIN)
      .sort((a, b) => b.value - a.value)
      .slice(0, 2)
      .map((m) => m.label);

    const popularity = Math.log1p(s.saves) / Math.log1p(maxSaves);
    const score = similarity + POPULARITY_WEIGHT * popularity + SPEAKER_WEIGHT * Math.min(speakerSaves, 3) / 3;
    picks.push({ sessionId: s.id, score, reason: explain(matchedInterests, speakerSaves), matchedInterests, speakerSaves });
  }

  if (picks.length === 0) return popular(input, available);
  picks.sort((a, b) => b.score - a.score || String(a.sessionId).localeCompare(String(b.sessionId)));
  return { mode: "interests", picks: picks.slice(0, limit) };
}
