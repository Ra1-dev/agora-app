import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createTempDb } from "./helpers/temp-db";

// Organizer desk on a temporary database: UC-05 (change a session), FR-06 (cancel), FR-07 (announce),
// UC-06 (aggregate stats).
type Db = Awaited<ReturnType<typeof createTempDb>>;
let db: Db;
let t: typeof import("@/db/schema");
let org: typeof import("@/server/organizer");
let bus: typeof import("@/server/live/bus");
let event: typeof import("@/db/schema").events.$inferSelect;
const at = (day: string, hhmm: string) => Date.UTC(2027, 4, Number(day), Number(hhmm.slice(0, 2)) - 5, Number(hhmm.slice(3)));
const NOW = at("15", "11:20");

beforeAll(async () => {
  db = await createTempDb();
  t = await import("@/db/schema");
  org = await import("@/server/organizer");
  bus = await import("@/server/live/bus");
  db.insert(t.events)
    .values({
      id: "ev", slug: "test", name: "Test Summit", code: "TEST", startsOn: "2027-05-14", endsOn: "2027-05-16",
      timeZone: "Asia/Almaty", city: "Astana", venueName: "Hall", organizerName: "Org", brandColor: "#5B3DF5", logoUrl: "/logo.svg",
    })
    .run();
  event = db.select().from(t.events).get()!;
  db.insert(t.tracks).values({ id: "tr", eventId: "ev", name: "AI", position: 1 }).run();
  db.insert(t.venues).values([
    { id: "hb", eventId: "ev", name: "Hall B", position: 1 },
    { id: "hc", eventId: "ev", name: "Hall C", position: 2 },
  ]).run();
  db.insert(t.sessions)
    .values({ id: "edge", eventId: "ev", trackId: "tr", venueId: "hb", title: "Small models on the edge", startsAt: at("15", "11:30"), endsAt: at("15", "12:15"), createdAt: 0, updatedAt: 0 })
    .run();
  for (const id of ["dana", "aruzhan", "ruslan", "organizer"]) {
    db.insert(t.users).values({ id, name: id, email: `${id}@example.com`, createdAt: 0 }).run();
    db.insert(t.memberships).values({ eventId: "ev", userId: id, role: id === "organizer" ? "organizer" : "participant", registeredAt: at("15", "08:00") }).run();
  }
  db.insert(t.savedSessions).values([
    { userId: "dana", sessionId: "edge", eventId: "ev", savedAt: 1 },
    { userId: "aruzhan", sessionId: "edge", eventId: "ev", savedAt: 1 },
  ]).run();
  db.insert(t.interactions).values([
    { eventId: "ev", userId: "dana", sessionId: "edge", kind: "save", createdAt: at("15", "09:00") },
    { eventId: "ev", userId: "dana", sessionId: "edge", kind: "view", createdAt: at("15", "09:00") },
  ]).run();
  db.insert(t.connections).values({ id: "c1", eventId: "ev", requesterId: "dana", recipientId: "aruzhan", status: "accepted", createdAt: 1, respondedAt: at("15", "10:00") }).run();
  db.insert(t.messages).values({ connectionId: "c1", senderId: "dana", body: "secret plans", createdAt: 2 }).run();
});

const notes = () => db.select().from(t.notifications).all();

describe("changeSession (UC-05)", () => {
  it("moves the room, notifies everyone who saved it, and pushes the change live", () => {
    const events: unknown[] = [];
    const off = bus.subscribe((e) => events.push(e));
    const result = org.changeSession(event, "edge", { date: "2027-05-15", start: "11:30", end: "12:15", venueId: "hc" }, NOW);
    off();
    expect(result).toEqual({ changeKind: "room_change", notified: 2, message: "Small models on the edge is now in Hall C. Same time, 11:30." });
    const s = db.select().from(t.sessions).where(eq(t.sessions.id, "edge")).get()!;
    expect(s.venueId).toBe("hc");
    expect(s.prevVenueId).toBe("hb");
    expect(notes().map((n) => n.userId).sort()).toEqual(["aruzhan", "dana"]);
    expect(events).toContainEqual({ type: "program", eventId: "ev", sessionId: "edge", change: "room_change" });
  });

  it("reschedules with the approved copy", () => {
    const r = org.changeSession(event, "edge", { date: "2027-05-15", start: "14:00", end: "14:45", venueId: "hc" }, NOW);
    expect(r.changeKind).toBe("rescheduled");
    expect(r.message).toBe("Small models on the edge now starts at 14:00 (was 11:30). Still in Hall C.");
  });

  it("rejects invalid changes and leaves the session as it was", () => {
    const change = (input: Partial<{ date: string; start: string; end: string; venueId: string }>) =>
      org.changeSession(event, "edge", { date: "2027-05-15", start: "14:00", end: "14:45", venueId: "hc", ...input }, NOW);
    expect(() => change({ end: "13:00" })).toThrow("End time must be after the start time.");
    expect(() => change({ date: "2027-05-17" })).toThrow("within the event dates");
    expect(() => change({ venueId: "nope" })).toThrow("Pick a room from the list.");
    expect(() => change({})).toThrow("Nothing changed.");
    expect(db.select().from(t.sessions).get()!.startsAt).toBe(at("15", "14:00"));
  });
});

describe("cancelSession (FR-06)", () => {
  it("cancels, keeps saves, and tells savers", () => {
    expect(org.cancelSession(event, "edge", NOW)).toEqual({ notified: 2 });
    expect(db.select().from(t.sessions).get()!.status).toBe("canceled");
    expect(db.select().from(t.savedSessions).all()).toHaveLength(2);
    expect(notes().filter((n) => n.kind === "canceled")).toHaveLength(2);
    expect(() => org.cancelSession(event, "edge", NOW)).toThrow("already canceled");
    expect(() => org.changeSession(event, "edge", { date: "2027-05-15", start: "15:00", end: "15:45", venueId: "hc" }, NOW)).toThrow("canceled");
  });

  it("reports how many savers each change reached", () => {
    const n = notes().find((x) => x.kind === "canceled" && x.userId === "dana")!;
    db.update(t.notifications).set({ deliveredAt: NOW }).where(eq(t.notifications.id, n.id)).run();
    expect(org.changeReach(["edge"]).get("edge")).toMatchObject({ kind: "canceled", reached: 1, total: 2 });
  });
});

describe("announcements (FR-07)", () => {
  it("goes to every participant, not the organizer", () => {
    const r = org.publishAnnouncement(event, "organizer", "Lunch is served on level 2 until 14:00.", NOW);
    expect(r.recipients).toBe(3);
    expect(notes().filter((n) => n.announcementId === r.id).map((n) => n.userId).sort()).toEqual(["aruzhan", "dana", "ruslan"]);
    expect(org.listAnnouncements("ev")[0]).toMatchObject({ recipientCount: 3, reached: 0 });
  });

  it("requires text", () => {
    expect(() => org.publishAnnouncement(event, "organizer", "  ", NOW)).toThrow("Write the announcement first.");
  });
});

describe("eventStats (UC-06)", () => {
  it("counts aggregates only", () => {
    const stats = org.eventStats(event, {}, NOW, true);
    const tile = (k: string) => stats.tiles.find((x) => x.key === k)!;
    expect(tile("registrations").value).toBe(3);
    expect(tile("saves").value).toBe(1);
    expect(tile("views").value).toBe(1);
    expect(tile("connections").value).toBe(1);
    expect(JSON.stringify(stats)).not.toContain("secret plans");
  });

  it("flags an empty time range", () => {
    const stats = org.eventStats(event, { day: "2027-05-15", from: "03:00", to: "04:00" }, NOW, true);
    expect(stats.empty).toBe(true);
    expect(org.eventStats(event, { day: "2027-05-15", from: "08:00", to: "12:00" }, NOW, true).empty).toBe(false);
  });
});
