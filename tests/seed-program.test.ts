import { describe, expect, it } from "vitest";
import {
  canceledCopy,
  connectionRequestCopy,
  rescheduledCopy,
  roomChangeCopy,
} from "@/lib/notifications/copy";
import { findOverlaps } from "@/lib/schedule/overlaps";
import { validateSessionTimes } from "@/lib/schedule/validate";
import { shortName, truncate } from "@/lib/text";
import { zonedTimeToUtc } from "@/lib/time";
import { INTERESTS, PEOPLE } from "../scripts/seed/people";
import { DAY_DATES, EVENT, PRIOR_CHANGES, SESSIONS, SPEAKERS, TRACKS, VENUES } from "../scripts/seed/program";

const TZ = EVENT.timeZone;
const times = (s: (typeof SESSIONS)[number]) => ({
  id: s.id,
  startsAt: zonedTimeToUtc(DAY_DATES[s.day], s.start, TZ),
  endsAt: zonedTimeToUtc(DAY_DATES[s.day], s.end, TZ),
});

describe("seed program (demo-scope)", () => {
  it("has the agreed shape: ~40 sessions, 6 tracks, 5 rooms, ~15 speakers", () => {
    expect(SESSIONS.length).toBeGreaterThanOrEqual(38);
    expect(TRACKS.map((t) => t.name)).toEqual(["AI", "Security", "HCI", "Robotics", "Data", "Design"]);
    expect(VENUES.map((v) => v.name)).toEqual(["Hall A", "Hall B", "Hall C", "Room 3", "Room 4"]);
    expect(SPEAKERS.length).toBe(15);
    expect(PEOPLE.length).toBe(30);
  });

  it("keeps every session valid and inside the event dates", () => {
    for (const s of SESSIONS) {
      const { startsAt, endsAt } = times(s);
      expect(validateSessionTimes(startsAt, endsAt, EVENT), s.id).toBeNull();
    }
  });

  it("never books one room twice", () => {
    for (const venue of VENUES) {
      const inRoom = SESSIONS.filter((s) => s.venue === venue.id).map(times);
      expect(findOverlaps(inRoom), venue.name).toEqual([]);
    }
  });

  it("has real parallel sessions on every day", () => {
    for (const day of ["fri", "sat", "sun"] as const) {
      expect(findOverlaps(SESSIONS.filter((s) => s.day === day).map(times)).length, day).toBeGreaterThan(3);
    }
  });

  it("leaves Hall C free for the UC-05 demo move of Small models on the edge", () => {
    const small = SESSIONS.find((s) => s.id === "se_small_models")!;
    const hallC = SESSIONS.filter((s) => s.venue === "ve_hall_c").map(times);
    expect(findOverlaps([...hallC, times(small)])).toEqual([]);
  });

  it("uses only known speakers, tracks and interests", () => {
    const speakerIds = new Set(SPEAKERS.map((s) => s.id));
    for (const s of SESSIONS) for (const sp of s.speakers) expect(speakerIds.has(sp), `${s.id} ${sp}`).toBe(true);
    for (const p of PEOPLE) for (const i of p.interests) expect(INTERESTS).toContain(i);
    expect(new Set(SESSIONS.map((s) => s.id)).size).toBe(SESSIONS.length);
    expect(SESSIONS.find((s) => s.id === PRIOR_CHANGES.rescheduled.sessionId)).toBeDefined();
    expect(SESSIONS.find((s) => s.id === PRIOR_CHANGES.canceled.sessionId)).toBeDefined();
  });

  it("gives Dana the declared interests and networking on", () => {
    const dana = PEOPLE.find((p) => p.id === "u_dana")!;
    expect(dana.interests).toEqual(["Edge AI", "Accessibility", "Privacy"]);
    expect(dana.networking).toBe(true);
  });
});

describe("notification copy (voice §4)", () => {
  const sat = (time: string) => zonedTimeToUtc("2027-05-15", time, TZ);

  it("matches the rewritten UC-05 messages", () => {
    expect(roomChangeCopy({ title: "Small models on the edge", startsAt: sat("11:30"), venueName: "Hall C" }, TZ)).toEqual({
      title: "Room change",
      body: "Small models on the edge is now in Hall C. Same time, 11:30.",
    });
    expect(
      rescheduledCopy(
        { title: "Privacy by design", startsAt: sat("14:00"), venueName: "Hall B", prevStartsAt: sat("11:30"), prevVenueName: "Hall B" },
        TZ,
      ).body,
    ).toBe("Privacy by design now starts at 14:00 (was 11:30). Still in Hall B.");
  });

  it("names the day and the new room when they change too", () => {
    const body = rescheduledCopy(
      {
        title: "Privacy by design",
        startsAt: zonedTimeToUtc("2027-05-16", "10:00", TZ),
        venueName: "Hall C",
        prevStartsAt: sat("11:45"),
        prevVenueName: "Hall A",
      },
      TZ,
    ).body;
    expect(body).toBe("Privacy by design now starts at Sun 10:00 (was Sat 11:45). Now in Hall C.");
  });

  it("matches the UC-02 cancel message", () => {
    expect(canceledCopy({ title: "Small models on the edge", startsAt: sat("11:30"), venueName: "Hall B" }, TZ).body).toBe(
      "Small models on the edge, Sat 11:30. It stays in My schedule, marked as canceled.",
    );
  });

  it("builds connection requests from visible fields only", () => {
    expect(connectionRequestCopy({ name: "Madina Omarova", title: "UX lead", sharedVisibleInterests: ["Accessibility"] })).toEqual({
      title: "Madina O. wants to connect",
      body: "UX lead. You both follow Accessibility.",
    });
    expect(connectionRequestCopy({ name: "Ruslan Bekmukhanov", sharedVisibleInterests: [] }).body).toBe(
      "Accept to start a conversation.",
    );
  });

  it("shortens names and long text", () => {
    expect(shortName("Aruzhan Kassymova")).toBe("Aruzhan K.");
    expect(shortName("Madi")).toBe("Madi");
    expect(truncate("Are you staying for the closing panel?", 20)).toBe("Are you staying for…");
  });
});
