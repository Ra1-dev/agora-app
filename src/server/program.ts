// Program data for participant screens: sessions with track, room, speakers and save counts,
// plus the viewer's saves, interests, picks and search.
import { and, asc, count, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  interactions,
  interests,
  notifications,
  savedSessions,
  sessionSpeakers,
  sessions,
  speakers,
  tracks,
  userInterests,
  venues,
} from "@/db/schema";
import { assignTrackInks, type TrackInkAssignment } from "@/lib/brand/track-inks";
import { deriveAccent } from "@/lib/brand/accent";
import { recommend, type PicksResult } from "@/lib/recs/picks";
import { searchSessions } from "@/lib/recs/search";
import { buildIndex, type TfidfIndex } from "@/lib/recs/tfidf";
import type { EventRow } from "./events";

export type Track = { id: string; name: string; position: number; description: string };
export type Venue = { id: string; name: string; floor: string };
export type Speaker = { id: string; name: string; organization: string; title: string; bio: string; tags: string[] };

export type ProgramSession = {
  id: string;
  title: string;
  abstract: string;
  format: "keynote" | "talk" | "panel" | "workshop";
  startsAt: number;
  endsAt: number;
  canceled: boolean;
  track: Track;
  venue: Venue;
  speakers: Speaker[];
  materialsUrl: string | null;
  changeKind: "rescheduled" | "room_change" | null;
  prevStartsAt: number | null;
  prevEndsAt: number | null;
  prevVenue: Venue | null;
  changedAt: number | null;
  /** Saves by everyone (popularity prior). */
  saves: number;
};

export type Program = {
  sessions: ProgramSession[];
  tracks: Track[];
  venues: Venue[];
  byId: Map<string, ProgramSession>;
  inks: Map<string, TrackInkAssignment>;
};

export function loadTracks(eventId: string): Track[] {
  return getDb()
    .select({ id: tracks.id, name: tracks.name, position: tracks.position, description: tracks.description })
    .from(tracks)
    .where(eq(tracks.eventId, eventId))
    .orderBy(asc(tracks.position))
    .all();
}

export function loadVenues(eventId: string): Venue[] {
  return getDb()
    .select({ id: venues.id, name: venues.name, floor: venues.floor })
    .from(venues)
    .where(eq(venues.eventId, eventId))
    .orderBy(asc(venues.position))
    .all();
}

/** Track inks for an event (S14), against its light-theme action colour. */
export function trackInks(event: Pick<EventRow, "brandColor">, trackList: Track[]) {
  return assignTrackInks(trackList, deriveAccent(event.brandColor).light.accent);
}

export function loadProgram(event: EventRow): Program {
  const db = getDb();
  const trackList = loadTracks(event.id);
  const venueList = loadVenues(event.id);
  const trackById = new Map(trackList.map((t) => [t.id, t]));
  const venueById = new Map(venueList.map((v) => [v.id, v]));

  const rows = db.select().from(sessions).where(eq(sessions.eventId, event.id)).orderBy(asc(sessions.startsAt), asc(sessions.title)).all();
  const speakerRows = db
    .select({ sessionId: sessionSpeakers.sessionId, position: sessionSpeakers.position, speaker: speakers })
    .from(sessionSpeakers)
    .innerJoin(speakers, eq(speakers.id, sessionSpeakers.speakerId))
    .where(eq(speakers.eventId, event.id))
    .orderBy(asc(sessionSpeakers.position))
    .all();
  const saveCounts = db
    .select({ sessionId: savedSessions.sessionId, n: count() })
    .from(savedSessions)
    .where(eq(savedSessions.eventId, event.id))
    .groupBy(savedSessions.sessionId)
    .all();
  const savesBySession = new Map(saveCounts.map((r) => [r.sessionId, r.n]));

  const list: ProgramSession[] = rows.map((s) => ({
    id: s.id,
    title: s.title,
    abstract: s.abstract,
    format: s.format,
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    canceled: s.status === "canceled",
    track: trackById.get(s.trackId)!,
    venue: venueById.get(s.venueId)!,
    speakers: speakerRows
      .filter((r) => r.sessionId === s.id)
      .map(({ speaker: sp }) => ({ id: sp.id, name: sp.name, organization: sp.organization, title: sp.title, bio: sp.bio, tags: sp.tags })),
    materialsUrl: s.materialsUrl,
    changeKind: s.changeKind,
    prevStartsAt: s.prevStartsAt,
    prevEndsAt: s.prevEndsAt,
    prevVenue: s.prevVenueId ? (venueById.get(s.prevVenueId) ?? null) : null,
    changedAt: s.changedAt,
    saves: savesBySession.get(s.id) ?? 0,
  }));

  return { sessions: list, tracks: trackList, venues: venueList, byId: new Map(list.map((s) => [s.id, s])), inks: trackInks(event, trackList) };
}

export function savedSessionIds(eventId: string, userId: string): Set<string> {
  return new Set(
    getDb()
      .select({ id: savedSessions.sessionId })
      .from(savedSessions)
      .where(and(eq(savedSessions.eventId, eventId), eq(savedSessions.userId, userId)))
      .all()
      .map((r) => r.id),
  );
}

export function checkedInSessionIds(eventId: string, userId: string): Set<string> {
  return new Set(
    getDb()
      .select({ id: interactions.sessionId })
      .from(interactions)
      .where(and(eq(interactions.eventId, eventId), eq(interactions.userId, userId), eq(interactions.kind, "check_in")))
      .all()
      .flatMap((r) => (r.id ? [r.id] : [])),
  );
}

export function declaredInterests(userId: string): string[] {
  return getDb()
    .select({ label: interests.label })
    .from(userInterests)
    .innerJoin(interests, eq(interests.id, userInterests.interestId))
    .where(eq(userInterests.userId, userId))
    .orderBy(asc(userInterests.position))
    .all()
    .map((r) => r.label);
}

export function unreadCount(eventId: string, userId: string): number {
  return (
    getDb()
      .select({ n: count() })
      .from(notifications)
      .where(and(eq(notifications.eventId, eventId), eq(notifications.userId, userId), isNull(notifications.readAt)))
      .get()?.n ?? 0
  );
}

function toDocs(program: Program) {
  return program.sessions.map((s) => ({
    id: s.id,
    title: s.title,
    abstract: s.abstract,
    trackName: s.track.name,
    trackId: s.track.id,
    speakerTags: s.speakers.flatMap((sp) => sp.tags),
    speakerNames: s.speakers.map((sp) => sp.name),
    speakerIds: s.speakers.map((sp) => sp.id),
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    canceled: s.canceled,
    saves: s.saves,
  }));
}

// The TF-IDF index depends only on session text, so it is cached per event until the text changes.
const indexCache = new Map<string, { key: string; index: TfidfIndex }>();

function indexFor(eventId: string, docs: ReturnType<typeof toDocs>): TfidfIndex {
  const key = docs.map((d) => `${d.id}:${d.title.length}:${d.abstract.length}`).join("|");
  const cached = indexCache.get(eventId);
  if (cached && cached.key === key) return cached.index;
  const index = buildIndex(docs);
  indexCache.set(eventId, { key, index });
  return index;
}

export function picksFor(
  event: EventRow,
  program: Program,
  input: { interests: string[]; savedIds: Set<string>; now: number; limit?: number },
): PicksResult {
  const docs = toDocs(program);
  return recommend({ sessions: docs, index: indexFor(event.id, docs), ...input });
}

export function searchProgram(event: EventRow, program: Program, query: string) {
  const docs = toDocs(program);
  return searchSessions(indexFor(event.id, docs), docs, query);
}

/** Records a session view (FR-19). */
export function recordView(eventId: string, userId: string, sessionId: string, at: number) {
  getDb().insert(interactions).values({ eventId, userId, sessionId, kind: "view", createdAt: at }).run();
}

export function sessionsByIds(program: Program, ids: Iterable<string>): ProgramSession[] {
  const out: ProgramSession[] = [];
  for (const id of ids) {
    const s = program.byId.get(id);
    if (s) out.push(s);
  }
  return out.sort((a, b) => a.startsAt - b.startsAt);
}

