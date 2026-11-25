// Saving sessions to My schedule (FR-12, UC-02). Saving never reserves a seat (DR-04).
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { interactions, savedSessions, sessions } from "@/db/schema";
import { AccessError } from "@/lib/auth/current-user";

export class SaveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SaveError";
  }
}

export const CANT_SAVE_CANCELED = "Canceled by the organizer. It can't be added to your schedule.";

function findSession(eventId: string, sessionId: string) {
  const session = getDb()
    .select({ id: sessions.id, status: sessions.status })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.eventId, eventId)))
    .get();
  if (!session) throw new AccessError(404, "This session isn't in the program.");
  return session;
}

/** Saves a session. Saving twice is a no-op (UC-02: no duplicate, no message). */
export function saveSession(eventId: string, userId: string, sessionId: string, at: number): { created: boolean } {
  const session = findSession(eventId, sessionId);
  const db = getDb();
  return db.transaction((tx) => {
    const existing = tx
      .select({ id: savedSessions.sessionId })
      .from(savedSessions)
      .where(and(eq(savedSessions.userId, userId), eq(savedSessions.sessionId, sessionId)))
      .get();
    if (existing) return { created: false };
    if (session.status === "canceled") throw new SaveError(CANT_SAVE_CANCELED);
    tx.insert(savedSessions).values({ userId, sessionId, eventId, savedAt: at }).run();
    tx.insert(interactions).values({ eventId, userId, sessionId, kind: "save", createdAt: at }).run();
    return { created: true };
  });
}

/** Removes a session from My schedule (also used by Resolve). */
export function unsaveSession(eventId: string, userId: string, sessionId: string): { removed: boolean } {
  findSession(eventId, sessionId);
  const result = getDb()
    .delete(savedSessions)
    .where(and(eq(savedSessions.userId, userId), eq(savedSessions.sessionId, sessionId), eq(savedSessions.eventId, eventId)))
    .run();
  return { removed: result.changes > 0 };
}
