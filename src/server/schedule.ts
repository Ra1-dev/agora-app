// Resolving overlaps in My schedule (FR-13, UC-02): keep one session, remove the other.
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { savedSessions, sessions } from "@/db/schema";
import { AccessError } from "@/lib/auth/current-user";
import { overlaps } from "@/lib/schedule/overlaps";

export class ResolveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResolveError";
  }
}

export function resolveOverlap(eventId: string, userId: string, keepId: string, removeId: string): void {
  if (!keepId || !removeId || keepId === removeId) throw new ResolveError("Pick the session to keep.");
  const db = getDb();
  const rows = db
    .select({ id: sessions.id, startsAt: sessions.startsAt, endsAt: sessions.endsAt, status: sessions.status })
    .from(sessions)
    .where(and(eq(sessions.eventId, eventId), inArray(sessions.id, [keepId, removeId])))
    .all();
  const keep = rows.find((r) => r.id === keepId);
  const remove = rows.find((r) => r.id === removeId);
  if (!keep || !remove) throw new AccessError(404, "This session isn't in the program.");

  const saved = db
    .select({ id: savedSessions.sessionId })
    .from(savedSessions)
    .where(and(eq(savedSessions.userId, userId), inArray(savedSessions.sessionId, [keepId, removeId])))
    .all()
    .map((r) => r.id);
  if (!saved.includes(keepId) || !saved.includes(removeId)) {
    throw new ResolveError("These sessions are no longer both in My schedule.");
  }
  const canceled = keep.status === "canceled" || remove.status === "canceled";
  if (canceled || !overlaps(keep, remove)) throw new ResolveError("These sessions don't overlap anymore.");

  db.delete(savedSessions)
    .where(and(eq(savedSessions.userId, userId), eq(savedSessions.sessionId, removeId), eq(savedSessions.eventId, eventId)))
    .run();
}
