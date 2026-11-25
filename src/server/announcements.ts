import { and, desc, eq, lte } from "drizzle-orm";
import { getDb } from "@/db/client";
import { announcements } from "@/db/schema";

export type Announcement = typeof announcements.$inferSelect;

/** The newest announcement published up to `now` (demo clock). */
export function latestAnnouncement(eventId: string, now: number): Announcement | undefined {
  return getDb()
    .select()
    .from(announcements)
    .where(and(eq(announcements.eventId, eventId), lte(announcements.publishedAt, now)))
    .orderBy(desc(announcements.publishedAt))
    .limit(1)
    .get();
}
