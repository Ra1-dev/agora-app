// "Starts in 10 min" (FR-20): one reminder per person and saved session, checked against the demo clock.
import { and, eq, gt, lte } from "drizzle-orm";
import { getDb } from "@/db/client";
import { savedSessions, sessions, venues } from "@/db/schema";
import { startsSoonCopy } from "@/lib/notifications/copy";
import { storeNotifications } from "./notify";

export const REMINDER_LEAD_MS = 10 * 60_000;

/** Creates missing reminders for sessions starting within the next 10 minutes. Returns new ids. */
export function checkStartsSoon(eventId: string, userId: string, now: number): number[] {
  const due = getDb()
    .select({ id: sessions.id, title: sessions.title, startsAt: sessions.startsAt, venueName: venues.name })
    .from(savedSessions)
    .innerJoin(sessions, eq(sessions.id, savedSessions.sessionId))
    .innerJoin(venues, eq(venues.id, sessions.venueId))
    .where(
      and(
        eq(savedSessions.userId, userId),
        eq(savedSessions.eventId, eventId),
        eq(sessions.status, "scheduled"),
        gt(sessions.startsAt, now),
        lte(sessions.startsAt, now + REMINDER_LEAD_MS),
      ),
    )
    .all();
  return storeNotifications(
    due.map((s) => ({
      eventId,
      userId,
      kind: "starts_soon" as const,
      ...startsSoonCopy(s),
      sessionId: s.id,
      // Keyed by start time too: a session moved to a new time gets a fresh reminder.
      dedupeKey: `starts_soon:${userId}:${s.id}:${s.startsAt}`,
      createdAt: now,
    })),
  );
}
