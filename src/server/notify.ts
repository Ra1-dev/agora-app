// Stores notifications (FR-20, FR-21). Live delivery is added on top of this in build step 8.
import { getDb } from "@/db/client";
import { notifications, type NotificationKind } from "@/db/schema";

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

/** Inserts notifications; rows whose dedupeKey already exists are skipped. Returns the inserted ids. */
export function storeNotifications(rows: NewNotification[]): number[] {
  if (rows.length === 0) return [];
  const db = getDb();
  const ids: number[] = [];
  db.transaction((tx) => {
    for (let i = 0; i < rows.length; i += 400) {
      const inserted = tx
        .insert(notifications)
        .values(rows.slice(i, i + 400))
        .onConflictDoNothing({ target: notifications.dedupeKey })
        .returning({ id: notifications.id })
        .all();
      ids.push(...inserted.map((r) => r.id));
    }
  });
  return ids;
}
