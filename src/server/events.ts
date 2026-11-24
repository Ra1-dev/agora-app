// Event lookups for pages and API routes.
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { events, memberships } from "@/db/schema";
import { dayKey } from "@/lib/time";

export type EventRow = typeof events.$inferSelect;

export function getEventBySlug(slug: string): EventRow | undefined {
  return getDb().select().from(events).where(eq(events.slug, slug)).get();
}

export function getEventByCode(code: string): EventRow | undefined {
  return getDb().select().from(events).where(eq(events.code, code.trim().toUpperCase())).get();
}

/** Events the person is a member of, soonest first. */
export function listEventsForUser(userId: string): (EventRow & { role: "participant" | "organizer" })[] {
  return getDb()
    .select({ event: events, role: memberships.role })
    .from(memberships)
    .innerJoin(events, eq(events.id, memberships.eventId))
    .where(eq(memberships.userId, userId))
    .orderBy(asc(events.startsOn))
    .all()
    .map(({ event, role }) => ({ ...event, role }));
}

/** "Live now" for the event as a whole: today (event zone) is one of its days. */
export function isEventLive(event: Pick<EventRow, "startsOn" | "endsOn" | "timeZone">, now: number): boolean {
  const today = dayKey(now, event.timeZone);
  return today >= event.startsOn && today <= event.endsOn;
}

/** Adds a participant membership if missing (join with an event code). */
export function ensureMembership(eventId: string, userId: string, now: number): void {
  const db = getDb();
  const exists = db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(and(eq(memberships.eventId, eventId), eq(memberships.userId, userId)))
    .get();
  if (!exists) db.insert(memberships).values({ eventId, userId, role: "participant", registeredAt: now }).run();
}
