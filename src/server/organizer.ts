// Organizer desk (UC-05, UC-06, FR-05–FR-07, FR-22). Stats are aggregates only (DR-06):
// counts of registrations, views, saves, check-ins and connections — never message contents.
import { and, asc, count, desc, eq, gte, inArray, isNotNull, lt, lte } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  announcements,
  connections,
  interactions,
  memberships,
  notifications,
  savedSessions,
  sessions,
  venues,
} from "@/db/schema";
import { AccessError } from "@/lib/auth/current-user";
import { announcementCopy, canceledCopy, rescheduledCopy, roomChangeCopy } from "@/lib/notifications/copy";
import { validateSessionTimes } from "@/lib/schedule/validate";
import { dayKey, zonedTimeToUtc } from "@/lib/time";
import type { EventRow } from "./events";
import { publish } from "./live/bus";
import { storeNotifications } from "./notify";

export class DeskError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "DeskError";
  }
}

/* ---------------- stats ---------------- */

export type StatsFilter = { day?: string; trackId?: string; sessionId?: string; from?: string; to?: string };

export type Stats = {
  computedAt: number;
  tiles: { key: string; label: string; value: number; today: number }[];
  sessions: { id: string; title: string; trackId: string; startsAt: number; canceled: boolean; views: number; saves: number; checkIns: number }[];
  /** True when the filter selects a period with no activity (UC-06 empty period). */
  empty: boolean;
};

const CACHE_MS = 5 * 60_000;
const cache = new Map<string, { realAt: number; stats: Stats }>();

/** Drops cached stats for an event (after a change the organizer made). */
export function invalidateStats(eventId: string) {
  for (const key of cache.keys()) if (key.startsWith(`${eventId}|`)) cache.delete(key);
}

/** [start, end) of a day in the event zone, optionally narrowed to from–to (HH:MM). */
function dayRange(event: EventRow, day: string, from?: string, to?: string): [number, number] {
  const midnight = zonedTimeToUtc(day, "00:00", event.timeZone);
  const start = from ? zonedTimeToUtc(day, from, event.timeZone) : midnight;
  const end = to ? zonedTimeToUtc(day, to, event.timeZone) : midnight + 86_400_000;
  return [start, Math.max(start, end)];
}

/**
 * Aggregates for the Overview. Cached for 5 minutes ("Updated N min ago");
 * `fresh` recomputes now.
 */
export function eventStats(event: EventRow, filter: StatsFilter, now: number, fresh = false): Stats {
  const key = `${event.id}|${JSON.stringify(filter)}`;
  const hit = cache.get(key);
  if (!fresh && hit && Date.now() - hit.realAt < CACHE_MS) return hit.stats;

  const db = getDb();
  const today = dayKey(now, event.timeZone);
  const [todayStart] = dayRange(event, today);

  // Sessions in scope (track, session filters).
  const sessionRows = db
    .select({ id: sessions.id, title: sessions.title, trackId: sessions.trackId, startsAt: sessions.startsAt, status: sessions.status })
    .from(sessions)
    .where(eq(sessions.eventId, event.id))
    .orderBy(asc(sessions.startsAt))
    .all()
    .filter((s) => (!filter.trackId || s.trackId === filter.trackId) && (!filter.sessionId || s.id === filter.sessionId));
  const sessionIds = sessionRows.map((s) => s.id);
  const sessionScoped = Boolean(filter.trackId || filter.sessionId);

  // Time scope: a day, optionally narrowed to a time range (UC-06 time filter).
  const range = filter.day ? dayRange(event, filter.day, filter.from, filter.to) : null;
  const inRange = (col: typeof interactions.createdAt) => (range ? [gte(col, range[0]), lt(col, range[1])] : []);
  const upToNow = lte(interactions.createdAt, now);

  const interactionCounts = (kind: "view" | "save" | "check_in") => {
    const base = [eq(interactions.eventId, event.id), eq(interactions.kind, kind), upToNow];
    const scope = sessionScoped ? [inArray(interactions.sessionId, sessionIds.length ? sessionIds : ["__none__"])] : [];
    const value = db.select({ n: count() }).from(interactions).where(and(...base, ...scope, ...inRange(interactions.createdAt))).get()?.n ?? 0;
    const todayN = db
      .select({ n: count() })
      .from(interactions)
      .where(and(...base, ...scope, gte(interactions.createdAt, todayStart)))
      .get()?.n ?? 0;
    return { value, today: todayN };
  };

  const regBase = [eq(memberships.eventId, event.id), eq(memberships.role, "participant"), lte(memberships.registeredAt, now)];
  const registrations = {
    value:
      db.select({ n: count() }).from(memberships).where(and(...regBase, ...(range ? [gte(memberships.registeredAt, range[0]), lt(memberships.registeredAt, range[1])] : []))).get()?.n ?? 0,
    today: db.select({ n: count() }).from(memberships).where(and(...regBase, gte(memberships.registeredAt, todayStart))).get()?.n ?? 0,
  };

  const connBase = [eq(connections.eventId, event.id), eq(connections.status, "accepted"), isNotNull(connections.respondedAt), lte(connections.respondedAt, now)];
  const connectionsStat = {
    value:
      db.select({ n: count() }).from(connections).where(and(...connBase, ...(range ? [gte(connections.respondedAt, range[0]), lt(connections.respondedAt, range[1])] : []))).get()?.n ?? 0,
    today: db.select({ n: count() }).from(connections).where(and(...connBase, gte(connections.respondedAt, todayStart))).get()?.n ?? 0,
  };

  const views = interactionCounts("view");
  const saves = interactionCounts("save");
  const checkIns = interactionCounts("check_in");

  // Per-session table: views, current saves, check-ins.
  const perSession = (kind: "view" | "check_in") =>
    new Map(
      db
        .select({ id: interactions.sessionId, n: count() })
        .from(interactions)
        .where(and(eq(interactions.eventId, event.id), eq(interactions.kind, kind), upToNow, ...inRange(interactions.createdAt)))
        .groupBy(interactions.sessionId)
        .all()
        .map((r) => [r.id, r.n]),
    );
  const viewMap = perSession("view");
  const checkInMap = perSession("check_in");
  const saveMap = new Map(
    db
      .select({ id: savedSessions.sessionId, n: count() })
      .from(savedSessions)
      .where(and(eq(savedSessions.eventId, event.id), lte(savedSessions.savedAt, now), ...(range ? [gte(savedSessions.savedAt, range[0]), lt(savedSessions.savedAt, range[1])] : [])))
      .groupBy(savedSessions.sessionId)
      .all()
      .map((r) => [r.id, r.n]),
  );

  const table = sessionRows
    .filter((s) => !filter.day || dayKey(s.startsAt, event.timeZone) === filter.day)
    .map((s) => ({
      id: s.id,
      title: s.title,
      trackId: s.trackId,
      startsAt: s.startsAt,
      canceled: s.status === "canceled",
      views: viewMap.get(s.id) ?? 0,
      saves: saveMap.get(s.id) ?? 0,
      checkIns: checkInMap.get(s.id) ?? 0,
    }))
    .sort((a, b) => b.saves - a.saves || a.startsAt - b.startsAt);

  const tiles = [
    { key: "registrations", label: "Registrations", ...registrations },
    { key: "saves", label: "Saves", ...saves },
    { key: "check-ins", label: "Check-ins", ...checkIns },
    { key: "connections", label: "Connections", ...connectionsStat },
    { key: "views", label: "Session views", ...views },
  ];
  const stats: Stats = {
    computedAt: now,
    tiles,
    sessions: table,
    empty: Boolean(range) && tiles.every((t) => t.value === 0),
  };
  cache.set(key, { realAt: Date.now(), stats });
  return stats;
}

/* ---------------- sessions ---------------- */

export type SessionChangeInput = { date: string; start: string; end: string; venueId: string };

function savers(sessionId: string): string[] {
  return getDb().select({ userId: savedSessions.userId }).from(savedSessions).where(eq(savedSessions.sessionId, sessionId)).all().map((r) => r.userId);
}

function loadSession(event: EventRow, sessionId: string) {
  const s = getDb().select().from(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.eventId, event.id))).get();
  if (!s) throw new AccessError(404, "This session isn't in this event.");
  return s;
}

function venueName(venueId: string): string {
  return getDb().select({ name: venues.name }).from(venues).where(eq(venues.id, venueId)).get()?.name ?? "";
}

/**
 * Changes a session's time and/or room (UC-05). Validates, saves, notifies everyone who saved it,
 * and pushes the change to open program views.
 */
export function changeSession(event: EventRow, sessionId: string, input: SessionChangeInput, now: number) {
  const s = loadSession(event, sessionId);
  if (s.status === "canceled") throw new DeskError("This session is canceled. Canceled sessions can't be moved.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new DeskError("Pick a day.", "date");
  if (!/^\d{1,2}:\d{2}$/.test(input.start)) throw new DeskError("Enter a start time like 14:00.", "start");
  if (!/^\d{1,2}:\d{2}$/.test(input.end)) throw new DeskError("Enter an end time like 14:45.", "end");
  const venue = getDb().select().from(venues).where(and(eq(venues.id, input.venueId), eq(venues.eventId, event.id))).get();
  if (!venue) throw new DeskError("Pick a room from the list.", "venueId");

  const startsAt = zonedTimeToUtc(input.date, input.start, event.timeZone);
  const endsAt = zonedTimeToUtc(input.date, input.end, event.timeZone);
  const invalid = validateSessionTimes(startsAt, endsAt, event);
  if (invalid) throw new DeskError(invalid.message, invalid.field === "startsAt" ? "start" : "end");

  const timeChanged = startsAt !== s.startsAt || endsAt !== s.endsAt;
  const roomChanged = venue.id !== s.venueId;
  if (!timeChanged && !roomChanged) throw new DeskError("Nothing changed. Edit the time or the room first.");

  const changeKind = timeChanged ? ("rescheduled" as const) : ("room_change" as const);
  getDb()
    .update(sessions)
    .set({
      startsAt,
      endsAt,
      venueId: venue.id,
      changeKind,
      prevStartsAt: s.startsAt,
      prevEndsAt: s.endsAt,
      prevVenueId: s.venueId,
      changedAt: now,
      updatedAt: now,
    })
    .where(eq(sessions.id, s.id))
    .run();

  const info = { title: s.title, startsAt, venueName: venue.name };
  const copy = timeChanged
    ? rescheduledCopy({ ...info, prevStartsAt: s.startsAt, prevVenueName: venueName(s.venueId) }, event.timeZone)
    : roomChangeCopy(info, event.timeZone);
  const people = savers(s.id);
  storeNotifications(
    people.map((userId) => ({ eventId: event.id, userId, kind: changeKind, ...copy, sessionId: s.id, createdAt: now })),
  );
  invalidateStats(event.id);
  publish({ type: "program", eventId: event.id, sessionId: s.id, change: changeKind });
  return { changeKind, notified: people.length, message: copy.body };
}

/** Cancels a session (FR-06). It stays in saved schedules, marked canceled; savers are told. */
export function cancelSession(event: EventRow, sessionId: string, now: number) {
  const s = loadSession(event, sessionId);
  if (s.status === "canceled") throw new DeskError("This session is already canceled.");
  getDb().update(sessions).set({ status: "canceled", canceledAt: now, updatedAt: now }).where(eq(sessions.id, s.id)).run();
  const copy = canceledCopy({ title: s.title, startsAt: s.startsAt, venueName: venueName(s.venueId) }, event.timeZone);
  const people = savers(s.id);
  storeNotifications(people.map((userId) => ({ eventId: event.id, userId, kind: "canceled" as const, ...copy, sessionId: s.id, createdAt: now })));
  invalidateStats(event.id);
  publish({ type: "program", eventId: event.id, sessionId: s.id, change: "canceled" });
  return { notified: people.length };
}

/** "Room change reached 212 of 240 people who saved this session." for the latest change. */
export function changeReach(sessionIds: string[]): Map<string, { kind: string; reached: number; total: number; at: number }> {
  if (sessionIds.length === 0) return new Map();
  const rows = getDb()
    .select({ id: notifications.id, sessionId: notifications.sessionId, kind: notifications.kind, createdAt: notifications.createdAt, deliveredAt: notifications.deliveredAt })
    .from(notifications)
    .where(and(inArray(notifications.sessionId, sessionIds), inArray(notifications.kind, ["room_change", "rescheduled", "canceled"])))
    .orderBy(asc(notifications.id))
    .all();
  // One change = the batch of notifications stored for it; the latest batch has the highest ids.
  const latest = new Map<string, { kind: string; at: number; firstId: number }>();
  for (const r of rows) {
    if (!r.sessionId) continue;
    const cur = latest.get(r.sessionId);
    if (!cur || r.createdAt > cur.at || (r.createdAt === cur.at && r.kind !== cur.kind)) {
      latest.set(r.sessionId, { kind: r.kind, at: r.createdAt, firstId: r.id });
    }
  }
  const result = new Map<string, { kind: string; reached: number; total: number; at: number }>();
  for (const [sessionId, l] of latest) {
    const batch = rows.filter((r) => r.sessionId === sessionId && r.id >= l.firstId && r.kind === l.kind && r.createdAt === l.at);
    result.set(sessionId, { kind: l.kind, at: l.at, total: batch.length, reached: batch.filter((r) => r.deliveredAt).length });
  }
  return result;
}

/* ---------------- announcements ---------------- */

export const ANNOUNCEMENT_MAX = 500;

export function publishAnnouncement(event: EventRow, authorId: string, body: string, now: number) {
  const text = body.trim().replace(/\s+\n/g, "\n");
  if (!text) throw new DeskError("Write the announcement first.", "body");
  if (text.length > ANNOUNCEMENT_MAX) throw new DeskError(`Keep it under ${ANNOUNCEMENT_MAX} characters.`, "body");
  const recipients = getDb()
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(and(eq(memberships.eventId, event.id), eq(memberships.role, "participant")))
    .all()
    .map((r) => r.userId);
  const id = `an_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  getDb()
    .insert(announcements)
    .values({ id, eventId: event.id, authorId, body: text, audience: "everyone", publishedAt: now, recipientCount: recipients.length })
    .run();
  storeNotifications(
    recipients.map((userId) => ({ eventId: event.id, userId, kind: "announcement" as const, ...announcementCopy(text), announcementId: id, actorId: authorId, createdAt: now })),
  );
  invalidateStats(event.id);
  return { id, recipients: recipients.length };
}

export function listAnnouncements(eventId: string) {
  const list = getDb().select().from(announcements).where(eq(announcements.eventId, eventId)).orderBy(desc(announcements.publishedAt)).all();
  const reached = new Map(
    getDb()
      .select({ id: notifications.announcementId, n: count() })
      .from(notifications)
      .where(and(eq(notifications.eventId, eventId), isNotNull(notifications.announcementId), isNotNull(notifications.deliveredAt)))
      .groupBy(notifications.announcementId)
      .all()
      .map((r) => [r.id, r.n]),
  );
  return list.map((a) => ({ ...a, reached: reached.get(a.id) ?? 0 }));
}
