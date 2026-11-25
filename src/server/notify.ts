// Notifications (FR-20, FR-21): stored first, then pushed to open tabs over SSE.
// A tab that was closed gets what it missed when it reconnects (Last-Event-ID / ?since=).
import { and, desc, eq, gt, inArray, isNull, max } from "drizzle-orm";
import { getDb } from "@/db/client";
import { notifications, type NotificationKind } from "@/db/schema";
import { publish } from "./live/bus";

export type NewNotification = {
  eventId: string;
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  sessionId?: string | null;
  connectionId?: string | null;
  announcementId?: string | null;
  actorId?: string | null;
  dedupeKey?: string | null;
  createdAt: number;
};

export type NotificationRow = typeof notifications.$inferSelect;

/**
 * Inserts notifications and publishes them for live delivery.
 * Rows whose dedupeKey already exists are skipped. Returns the inserted ids.
 */
export function storeNotifications(rows: NewNotification[]): number[] {
  if (rows.length === 0) return [];
  const db = getDb();
  const inserted: { id: number; userId: string; eventId: string }[] = [];
  db.transaction((tx) => {
    for (let i = 0; i < rows.length; i += 400) {
      inserted.push(
        ...tx
          .insert(notifications)
          .values(rows.slice(i, i + 400))
          .onConflictDoNothing({ target: notifications.dedupeKey })
          .returning({ id: notifications.id, userId: notifications.userId, eventId: notifications.eventId })
          .all(),
      );
    }
  });
  const byEvent = new Map<string, Record<string, number[]>>();
  for (const n of inserted) {
    const byUser = byEvent.get(n.eventId) ?? {};
    (byUser[n.userId] ??= []).push(n.id);
    byEvent.set(n.eventId, byUser);
  }
  for (const [eventId, byUser] of byEvent) publish({ type: "notifications", eventId, byUser });
  return inserted.map((n) => n.id);
}

export function listNotifications(eventId: string, userId: string, limit = 100): NotificationRow[] {
  return getDb()
    .select()
    .from(notifications)
    .where(and(eq(notifications.eventId, eventId), eq(notifications.userId, userId)))
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(limit)
    .all();
}

/** Notifications after `sinceId`, oldest first: what a reconnecting tab missed. */
export function notificationsSince(eventId: string, userId: string, sinceId: number, limit = 50): NotificationRow[] {
  return getDb()
    .select()
    .from(notifications)
    .where(and(eq(notifications.eventId, eventId), eq(notifications.userId, userId), gt(notifications.id, sinceId)))
    .orderBy(notifications.id)
    .limit(limit)
    .all();
}

export function notificationsByIds(ids: number[]): NotificationRow[] {
  if (ids.length === 0) return [];
  return getDb().select().from(notifications).where(inArray(notifications.id, ids)).orderBy(notifications.id).all();
}

export function latestNotificationId(eventId: string, userId: string): number {
  return (
    getDb()
      .select({ id: max(notifications.id) })
      .from(notifications)
      .where(and(eq(notifications.eventId, eventId), eq(notifications.userId, userId)))
      .get()?.id ?? 0
  );
}

/** Records delivery (for "Reached N people"): set once, the first time a tab gets it. */
export function markDelivered(ids: number[], at: number): void {
  if (ids.length === 0) return;
  getDb()
    .update(notifications)
    .set({ deliveredAt: at })
    .where(and(inArray(notifications.id, ids), isNull(notifications.deliveredAt)))
    .run();
}

export function markRead(eventId: string, userId: string, at: number, ids?: number[]): number {
  const where = [eq(notifications.eventId, eventId), eq(notifications.userId, userId), isNull(notifications.readAt)];
  if (ids) {
    if (ids.length === 0) return 0;
    where.push(inArray(notifications.id, ids));
  }
  const result = getDb()
    .update(notifications)
    .set({ readAt: at, deliveredAt: at })
    .where(and(...where))
    .run();
  return result.changes;
}
