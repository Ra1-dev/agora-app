import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTempDb } from "./helpers/temp-db";

// Integration tests on a real (temporary) SQLite database: saving (UC-02) and resolving overlaps (FR-13).
type Db = Awaited<ReturnType<typeof createTempDb>>;
let db: Db;
let t: typeof import("@/db/schema");
let saves: typeof import("@/server/saves");
let schedule: typeof import("@/server/schedule");

const EVENT = "ev_test";
const USER = "u_test";
const at = (hhmm: string) => Date.UTC(2027, 4, 15, Number(hhmm.slice(0, 2)) - 5, Number(hhmm.slice(3)));

beforeAll(async () => {
  db = await createTempDb();
  t = await import("@/db/schema");
  saves = await import("@/server/saves");
  schedule = await import("@/server/schedule");

  db.insert(t.events)
    .values({
      id: EVENT, slug: "test", name: "Test Summit", code: "TEST", startsOn: "2027-05-15", endsOn: "2027-05-15",
      timeZone: "Asia/Almaty", city: "Astana", venueName: "Hall", organizerName: "Org", brandColor: "#5B3DF5", logoUrl: "/logo.svg",
    })
    .run();
  db.insert(t.tracks).values({ id: "tr", eventId: EVENT, name: "AI", position: 1 }).run();
  db.insert(t.venues).values({ id: "ve", eventId: EVENT, name: "Hall A", position: 1 }).run();
  const session = (id: string, start: string, end: string, status: "scheduled" | "canceled" = "scheduled") => ({
    id, eventId: EVENT, trackId: "tr", venueId: "ve", title: id, startsAt: at(start), endsAt: at(end), status, createdAt: 0, updatedAt: 0,
  });
  db.insert(t.sessions)
    .values([
      session("edge", "11:30", "12:15"),
      session("privacy", "11:45", "12:30"),
      session("lunch", "12:15", "13:00"),
      session("robots", "11:30", "12:15", "canceled"),
    ])
    .run();
  db.insert(t.users).values({ id: USER, name: "Test Person", email: "t@example.com", createdAt: 0 }).run();
  db.insert(t.memberships).values({ eventId: EVENT, userId: USER, role: "participant", registeredAt: 0 }).run();
});

beforeEach(() => {
  db.delete(t.savedSessions).run();
});

const savedIds = () => db.select().from(t.savedSessions).all().map((r) => r.sessionId).sort();

describe("saveSession / unsaveSession", () => {
  it("saves once; saving again creates no duplicate", () => {
    expect(saves.saveSession(EVENT, USER, "edge", 1)).toEqual({ created: true });
    expect(saves.saveSession(EVENT, USER, "edge", 2)).toEqual({ created: false });
    expect(savedIds()).toEqual(["edge"]);
  });

  it("refuses a canceled session with the approved copy", () => {
    expect(() => saves.saveSession(EVENT, USER, "robots", 1)).toThrow(
      "Canceled by the organizer. It can't be added to your schedule.",
    );
  });

  it("keeps a session that was saved before it was canceled (no-op save)", () => {
    db.insert(t.savedSessions).values({ userId: USER, sessionId: "robots", eventId: EVENT, savedAt: 0 }).run();
    expect(saves.saveSession(EVENT, USER, "robots", 1)).toEqual({ created: false });
  });

  it("rejects sessions from another event", () => {
    expect(() => saves.saveSession("ev_other", USER, "edge", 1)).toThrow("isn't in the program");
  });

  it("removes a saved session", () => {
    saves.saveSession(EVENT, USER, "edge", 1);
    expect(saves.unsaveSession(EVENT, USER, "edge")).toEqual({ removed: true });
    expect(savedIds()).toEqual([]);
  });
});

describe("resolveOverlap", () => {
  it("keeps one session and removes the other", () => {
    saves.saveSession(EVENT, USER, "edge", 1);
    saves.saveSession(EVENT, USER, "privacy", 1);
    schedule.resolveOverlap(EVENT, USER, "edge", "privacy");
    expect(savedIds()).toEqual(["edge"]);
  });

  it("refuses back-to-back sessions (not an overlap)", () => {
    saves.saveSession(EVENT, USER, "edge", 1);
    saves.saveSession(EVENT, USER, "lunch", 1);
    expect(() => schedule.resolveOverlap(EVENT, USER, "edge", "lunch")).toThrow("don't overlap");
    expect(savedIds()).toEqual(["edge", "lunch"]);
  });

  it("refuses when one session is no longer saved", () => {
    saves.saveSession(EVENT, USER, "edge", 1);
    expect(() => schedule.resolveOverlap(EVENT, USER, "edge", "privacy")).toThrow("no longer both");
  });

  it("refuses keeping and removing the same session", () => {
    expect(() => schedule.resolveOverlap(EVENT, USER, "edge", "edge")).toThrow("Pick the session to keep.");
  });
});
