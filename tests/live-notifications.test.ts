import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { present } from "@/lib/notifications/present";
import { createTempDb } from "./helpers/temp-db";

// Stored notifications, live publishing, catch-up and reminders (FR-20, FR-21) on a temporary database.
type Db = Awaited<ReturnType<typeof createTempDb>>;
let db: Db;
let t: typeof import("@/db/schema");
let notify: typeof import("@/server/notify");
let reminders: typeof import("@/server/reminders");
let bus: typeof import("@/server/live/bus");
const EVENT = "ev_test";
const at = (hhmm: string) => Date.UTC(2027, 4, 15, Number(hhmm.slice(0, 2)) - 5, Number(hhmm.slice(3)));

beforeAll(async () => {
  db = await createTempDb();
  t = await import("@/db/schema");
  notify = await import("@/server/notify");
  reminders = await import("@/server/reminders");
  bus = await import("@/server/live/bus");
  db.insert(t.events)
    .values({
      id: EVENT, slug: "test", name: "Test Summit", code: "TEST", startsOn: "2027-05-15", endsOn: "2027-05-15",
      timeZone: "Asia/Almaty", city: "Astana", venueName: "Hall", organizerName: "Org", brandColor: "#5B3DF5", logoUrl: "/logo.svg",
    })
    .run();
  db.insert(t.tracks).values({ id: "tr", eventId: EVENT, name: "AI", position: 1 }).run();
  db.insert(t.venues).values({ id: "ve", eventId: EVENT, name: "Hall B", position: 1 }).run();
  const session = (id: string, start: string, status: "scheduled" | "canceled" = "scheduled") => ({
    id, eventId: EVENT, trackId: "tr", venueId: "ve", title: `Talk ${id}`, startsAt: at(start), endsAt: at(start) + 45 * 60_000,
    status, createdAt: 0, updatedAt: 0,
  });
  db.insert(t.sessions).values([session("soon", "11:30"), session("later", "14:00"), session("gone", "11:28", "canceled")]).run();
  for (const id of ["dana", "aruzhan"]) {
    db.insert(t.users).values({ id, name: id, email: `${id}@example.com`, createdAt: 0 }).run();
    db.insert(t.memberships).values({ eventId: EVENT, userId: id, role: "participant", registeredAt: 0 }).run();
  }
  for (const sessionId of ["soon", "later", "gone"]) db.insert(t.savedSessions).values({ userId: "dana", sessionId, eventId: EVENT, savedAt: 0 }).run();
});

describe("storeNotifications", () => {
  it("stores, then publishes ids per user for live delivery", () => {
    const seen: unknown[] = [];
    const off = bus.subscribe((e) => seen.push(e));
    const ids = notify.storeNotifications([
      { eventId: EVENT, userId: "dana", kind: "announcement", title: "From the organizer", body: "Lunch at 13:00.", createdAt: 1 },
      { eventId: EVENT, userId: "aruzhan", kind: "announcement", title: "From the organizer", body: "Lunch at 13:00.", createdAt: 1 },
    ]);
    off();
    expect(ids).toHaveLength(2);
    expect(seen).toEqual([{ type: "notifications", eventId: EVENT, byUser: { dana: [ids[0]], aruzhan: [ids[1]] } }]);
  });

  it("returns what a reconnecting tab missed, oldest first", () => {
    const first = notify.latestNotificationId(EVENT, "dana");
    const aruzhanLatest = notify.latestNotificationId(EVENT, "aruzhan");
    const [a, b] = notify.storeNotifications([
      { eventId: EVENT, userId: "dana", kind: "message", title: "Aruzhan", body: "One", createdAt: 2 },
      { eventId: EVENT, userId: "dana", kind: "message", title: "Aruzhan", body: "Two", createdAt: 3 },
    ]);
    expect(notify.notificationsSince(EVENT, "dana", first).map((n) => n.id)).toEqual([a, b]);
    expect(notify.notificationsSince(EVENT, "aruzhan", aruzhanLatest)).toEqual([]);
  });

  it("marks delivery once and read on request", () => {
    const [id] = notify.storeNotifications([{ eventId: EVENT, userId: "dana", kind: "announcement", title: "x", body: "y", createdAt: 4 }]);
    notify.markDelivered([id!], 10);
    notify.markDelivered([id!], 20);
    expect(notify.notificationsByIds([id!])[0]?.deliveredAt).toBe(10);
    expect(notify.markRead(EVENT, "dana", 30, [id!])).toBe(1);
    expect(notify.markRead(EVENT, "dana", 31)).toBeGreaterThan(0); // all the rest
    expect(notify.markRead(EVENT, "dana", 32)).toBe(0);
  });
});

describe("starts in 10 min", () => {
  it("reminds about saved sessions starting within 10 minutes, once, never canceled ones", () => {
    const ids = reminders.checkStartsSoon(EVENT, "dana", at("11:20"));
    expect(ids).toHaveLength(1);
    const [n] = notify.notificationsByIds(ids);
    expect(n?.title).toBe("Starts in 10 min");
    expect(n?.body).toBe("Talk soon, Hall B.");
    expect(reminders.checkStartsSoon(EVENT, "dana", at("11:25"))).toEqual([]);
    expect(reminders.checkStartsSoon(EVENT, "dana", at("11:10"))).toEqual([]); // 20 min out: too early
  });

  it("reminds again when the session moved to a new time", () => {
    db.update(t.sessions).set({ startsAt: at("13:00"), endsAt: at("13:45") }).where(eq(t.sessions.id, "soon")).run();
    expect(reminders.checkStartsSoon(EVENT, "dana", at("12:52"))).toHaveLength(1);
  });
});

describe("presentation", () => {
  it("links each kind to the place where you act on it", () => {
    expect(present("s", { kind: "room_change", sessionId: "x", connectionId: null })).toMatchObject({ href: "/e/s/sessions/x", tone: "warning" });
    expect(present("s", { kind: "canceled", sessionId: "x", connectionId: null }).tone).toBe("error");
    expect(present("s", { kind: "message", sessionId: null, connectionId: "c" })).toMatchObject({ href: "/e/s/messages/c", action: "Reply" });
    expect(present("s", { kind: "announcement", sessionId: null, connectionId: null }).href).toBeNull();
  });
});
