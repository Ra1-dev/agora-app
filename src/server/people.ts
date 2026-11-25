// People, connections and messages (FR-16–FR-18, UC-04, DR-05).
// Matching and explanations use only fields people made visible; messages are private to the pair.
import { and, asc, desc, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { connections, interests, memberships, messages, notifications, profiles, userInterests, users } from "@/db/schema";
import { AccessError } from "@/lib/auth/current-user";
import { connectionAcceptedCopy, connectionRequestCopy, messageCopy } from "@/lib/notifications/copy";
import { sharedVisibleInterests } from "@/lib/people/suggest";
import type { Profile } from "@/lib/people/visibility";
import { firstName } from "@/lib/text";
import { storeNotifications } from "./notify";

export class PeopleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PeopleError";
  }
}

/* ---------------- profiles ---------------- */

function toProfiles(rows: { user: typeof users.$inferSelect; profile: typeof profiles.$inferSelect | null }[]): Profile[] {
  const ids = rows.map((r) => r.user.id);
  const interestRows = ids.length
    ? getDb()
        .select({ userId: userInterests.userId, label: interests.label })
        .from(userInterests)
        .innerJoin(interests, eq(interests.id, userInterests.interestId))
        .where(inArray(userInterests.userId, ids))
        .orderBy(asc(userInterests.position))
        .all()
    : [];
  return rows.map(({ user, profile: p }) => ({
    userId: user.id,
    name: user.name,
    organization: p?.organization ?? null,
    title: p?.title ?? null,
    bio: p?.bio ?? null,
    skills: p?.skills ?? [],
    interests: interestRows.filter((i) => i.userId === user.id).map((i) => i.label),
    networkingOptIn: p?.networkingOptIn ?? false,
    visibility: {
      organization: p?.showOrganization ?? false,
      title: p?.showTitle ?? false,
      interests: p?.showInterests ?? false,
      bio: p?.showBio ?? false,
      skills: p?.showSkills ?? false,
    },
  }));
}

/** Participants of the event who can appear in People: open to networking or with something visible. */
export function listedParticipants(eventId: string): Profile[] {
  const rows = getDb()
    .select({ user: users, profile: profiles })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(and(eq(memberships.eventId, eventId), eq(memberships.role, "participant")))
    .orderBy(asc(users.name))
    .all();
  return toProfiles(rows).filter(
    (p) => p.networkingOptIn || p.visibility.organization || p.visibility.title || p.visibility.interests || p.visibility.bio,
  );
}

export function getProfile(userId: string): Profile | undefined {
  const rows = getDb()
    .select({ user: users, profile: profiles })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(users.id, userId))
    .all();
  return toProfiles(rows)[0];
}

export function getEmail(userId: string): string {
  return getDb().select({ email: users.email }).from(users).where(eq(users.id, userId)).get()?.email ?? "";
}

export function allInterests(): string[] {
  return getDb().select({ label: interests.label }).from(interests).orderBy(asc(interests.label)).all().map((r) => r.label);
}

/* ---------------- connections ---------------- */

export type Connection = typeof connections.$inferSelect;

export type ConnectionView = Connection & {
  otherId: string;
  direction: "outgoing" | "incoming";
};

export function connectionsFor(eventId: string, userId: string): ConnectionView[] {
  return getDb()
    .select()
    .from(connections)
    .where(and(eq(connections.eventId, eventId), or(eq(connections.requesterId, userId), eq(connections.recipientId, userId))))
    .orderBy(desc(connections.createdAt))
    .all()
    .map((c) => ({
      ...c,
      otherId: c.requesterId === userId ? c.recipientId : c.requesterId,
      direction: c.requesterId === userId ? ("outgoing" as const) : ("incoming" as const),
    }));
}

export function getConnection(eventId: string, connectionId: string, userId: string): ConnectionView {
  const c = getDb().select().from(connections).where(and(eq(connections.id, connectionId), eq(connections.eventId, eventId))).get();
  // Other people's conversations look like they don't exist (UC-04: others can't see private messages).
  if (!c || (c.requesterId !== userId && c.recipientId !== userId)) throw new AccessError(404, "We couldn't find this conversation.");
  return {
    ...c,
    otherId: c.requesterId === userId ? c.recipientId : c.requesterId,
    direction: c.requesterId === userId ? "outgoing" : "incoming",
  };
}

function isMember(eventId: string, userId: string): boolean {
  return Boolean(
    getDb()
      .select({ id: memberships.userId })
      .from(memberships)
      .where(and(eq(memberships.eventId, eventId), eq(memberships.userId, userId)))
      .get(),
  );
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

/** Sends a connection request (UC-04). Both people must be open to networking. */
export function requestConnection(eventId: string, fromId: string, toId: string, now: number): Connection {
  if (fromId === toId) throw new PeopleError("You can't connect with yourself.");
  if (!isMember(eventId, toId)) throw new AccessError(404, "This person isn't at this event.");
  const from = getProfile(fromId);
  const to = getProfile(toId);
  if (!from || !to) throw new AccessError(404, "This person isn't at this event.");
  if (!from.networkingOptIn) throw new PeopleError("Turn on “Open to networking” in Profile to send requests.");
  if (!to.networkingOptIn) throw new PeopleError(`${firstName(to.name)} isn't open to networking.`);

  const existing = connectionsFor(eventId, fromId).find((c) => c.otherId === toId);
  if (existing) {
    if (existing.status === "declined") throw new PeopleError(`You can't send ${firstName(to.name)} another request.`);
    return existing; // Pending or accepted already: nothing new.
  }

  const connection: Connection = {
    id: newId("cn"),
    eventId,
    requesterId: fromId,
    recipientId: toId,
    status: "pending",
    createdAt: now,
    respondedAt: null,
  };
  getDb().insert(connections).values(connection).run();
  storeNotifications([
    {
      eventId,
      userId: toId,
      kind: "connection_request",
      ...connectionRequestCopy({
        name: from.name,
        title: from.visibility.title ? (from.title ?? undefined) : undefined,
        sharedVisibleInterests: from.visibility.interests ? sharedVisibleInterests(to.interests, from) : [],
      }),
      connectionId: connection.id,
      actorId: fromId,
      createdAt: now,
    },
  ]);
  return connection;
}

/** Accept or decline an incoming request. Only the recipient can answer. */
export function respondToConnection(eventId: string, connectionId: string, userId: string, accept: boolean, now: number) {
  const c = getConnection(eventId, connectionId, userId);
  if (c.recipientId !== userId) throw new PeopleError("Only the person who got the request can answer it.");
  if (c.status !== "pending") throw new PeopleError("This request was already answered.");
  const status = accept ? ("accepted" as const) : ("declined" as const);
  getDb().update(connections).set({ status, respondedAt: now }).where(eq(connections.id, c.id)).run();
  // The request notification is answered: mark it read.
  getDb()
    .update(notifications)
    .set({ readAt: now })
    .where(and(eq(notifications.connectionId, c.id), eq(notifications.userId, userId), isNull(notifications.readAt)))
    .run();
  if (accept) {
    const me = getProfile(userId)!;
    storeNotifications([
      { eventId, userId: c.requesterId, kind: "connection_accepted", ...connectionAcceptedCopy(me.name), connectionId: c.id, actorId: userId, createdAt: now },
    ]);
  }
  return { status };
}

/* ---------------- messages ---------------- */

export type Message = typeof messages.$inferSelect;

export const MESSAGE_MAX = 2000;

export function listMessages(connectionId: string): Message[] {
  return getDb().select().from(messages).where(eq(messages.connectionId, connectionId)).orderBy(asc(messages.createdAt), asc(messages.id)).all();
}

/** Messaging only between people with an accepted connection in the same event (DR-05). */
export function sendMessage(eventId: string, connectionId: string, senderId: string, body: string, now: number): Message {
  const c = getConnection(eventId, connectionId, senderId);
  const text = body.trim();
  if (c.status !== "accepted") {
    const other = getProfile(c.otherId);
    throw new PeopleError(`You can message once ${firstName(other?.name ?? "they")} accepts your request.`);
  }
  if (!text) throw new PeopleError("Write a message first.");
  if (text.length > MESSAGE_MAX) throw new PeopleError(`Keep messages under ${MESSAGE_MAX} characters.`);
  const [message] = getDb().insert(messages).values({ connectionId, senderId, body: text, createdAt: now }).returning().all();
  const sender = getProfile(senderId)!;
  storeNotifications([
    { eventId, userId: c.otherId, kind: "message", ...messageCopy(sender.name, text), connectionId, actorId: senderId, createdAt: now },
  ]);
  return message!;
}

/** Opening a conversation marks its message notifications as read. */
export function markConversationRead(eventId: string, connectionId: string, userId: string, now: number): number {
  return getDb()
    .update(notifications)
    .set({ readAt: now })
    .where(
      and(
        eq(notifications.eventId, eventId),
        eq(notifications.userId, userId),
        eq(notifications.connectionId, connectionId),
        ne(notifications.kind, "connection_request"),
        isNull(notifications.readAt),
      ),
    )
    .run().changes;
}

/** Latest message per connection, for the People list. */
export function lastMessages(connectionIds: string[]): Map<string, Message> {
  if (connectionIds.length === 0) return new Map();
  const rows = getDb()
    .select()
    .from(messages)
    .where(inArray(messages.connectionId, connectionIds))
    .orderBy(asc(messages.createdAt), asc(messages.id))
    .all();
  const map = new Map<string, Message>();
  for (const m of rows) map.set(m.connectionId, m);
  return map;
}

/* ---------------- profile ---------------- */

/** Saves the participant's own profile (UC-01, FR-08). Changes apply to picks and People right away. */
export function updateProfile(userId: string, input: import("@/lib/people/profile-input").ProfileInput, now: number) {
  const db = getDb();
  const interestIds = db
    .select({ id: interests.id, label: interests.label })
    .from(interests)
    .where(input.interests.length ? inArray(interests.label, input.interests) : eq(interests.id, "__none__"))
    .all();
  db.transaction((tx) => {
    tx.update(users).set({ email: input.email.trim() }).where(eq(users.id, userId)).run();
    const values = {
      organization: input.organization.trim() || null,
      title: input.title.trim() || null,
      bio: input.bio.trim() || null,
      skills: input.skills,
      networkingOptIn: input.networkingOptIn,
      showOrganization: input.visibility.organization,
      showTitle: input.visibility.title,
      showInterests: input.visibility.interests,
      showBio: input.visibility.bio,
      showSkills: input.visibility.skills,
      updatedAt: now,
    };
    tx.insert(profiles).values({ userId, ...values }).onConflictDoUpdate({ target: profiles.userId, set: values }).run();
    tx.delete(userInterests).where(eq(userInterests.userId, userId)).run();
    const ordered = input.interests.flatMap((label, position) => {
      const row = interestIds.find((i) => i.label === label);
      return row ? [{ userId, interestId: row.id, position }] : [];
    });
    if (ordered.length) tx.insert(userInterests).values(ordered).run();
  });
}

export function emailTaken(email: string, userId: string): boolean {
  return Boolean(
    getDb()
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, email.trim()), ne(users.id, userId)))
      .get(),
  );
}
