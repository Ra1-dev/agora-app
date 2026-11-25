import { describe, expect, it } from "vitest";
import { rowState, type RowInput } from "@/lib/schedule/row-state";
import { zonedTimeToUtc } from "@/lib/time";

const TZ = "Asia/Almaty";
const sat = (t: string) => zonedTimeToUtc("2027-05-15", t, TZ);
const NOW = sat("11:20");

const base: RowInput = {
  title: "Small models on the edge",
  startsAt: sat("11:30"),
  endsAt: sat("12:15"),
  canceled: false,
  venueName: "Hall B",
  changeKind: null,
  prevStartsAt: null,
  prevVenueName: null,
};
const ctx = { now: NOW, timeZone: TZ, saved: false, overlapsWith: [], pickReason: null };

describe("programme row states (S12 §12.4)", () => {
  it("default: Save, no chips", () => {
    const s = rowState(base, ctx);
    expect(s.chips).toEqual([]);
    expect(s.save).toBe("save");
    expect(s.messages).toEqual([]);
  });

  it("picked for you: chip and reason in accent, only while not saved", () => {
    const s = rowState(base, { ...ctx, pickReason: "Because you follow Edge AI." });
    expect(s.chips).toEqual(["picked"]);
    expect(s.messages).toEqual([{ tone: "accent", text: "Because you follow Edge AI." }]);
    expect(rowState(base, { ...ctx, saved: true, pickReason: "Because you follow Edge AI." }).chips).toEqual([]);
  });

  it("saved: Saved button", () => {
    expect(rowState(base, { ...ctx, saved: true }).save).toBe("saved");
  });

  it("overlaps: only for saved sessions, names the other session", () => {
    const s = rowState(base, { ...ctx, saved: true, overlapsWith: ["Privacy by design"] });
    expect(s.overlaps).toBe(true);
    expect(s.messages.at(-1)).toEqual({ tone: "warning", text: "Overlaps with Privacy by design." });
    expect(rowState(base, { ...ctx, overlapsWith: ["Privacy by design"] }).overlaps).toBe(false);
  });

  it("live now: chip and end time; not live once it ends", () => {
    const live = rowState({ ...base, startsAt: sat("10:45"), endsAt: sat("11:30") }, ctx);
    expect(live.chips).toEqual(["live"]);
    expect(live.messages[0]?.text).toBe("Ends at 11:30.");
    const ended = rowState({ ...base, startsAt: sat("10:00"), endsAt: sat("11:20") }, ctx);
    expect(ended.live).toBe(false);
    expect(ended.ended).toBe(true);
  });

  it("rescheduled: old start struck through and the change explained", () => {
    const s = rowState(
      { ...base, venueName: "Room 3", startsAt: sat("15:00"), endsAt: sat("15:45"), changeKind: "rescheduled", prevStartsAt: sat("14:00"), prevVenueName: "Room 3" },
      ctx,
    );
    expect(s.chips).toEqual(["rescheduled"]);
    expect(s.oldStart).toBe("14:00");
    expect(s.messages[0]?.text).toBe("Now 15:00 (was 14:00). Still in Room 3.");
  });

  it("rescheduled to another day and room", () => {
    const s = rowState(
      {
        ...base,
        venueName: "Hall C",
        startsAt: zonedTimeToUtc("2027-05-16", "10:00", TZ),
        endsAt: zonedTimeToUtc("2027-05-16", "10:45", TZ),
        changeKind: "rescheduled",
        prevStartsAt: sat("11:45"),
        prevVenueName: "Hall A",
      },
      ctx,
    );
    expect(s.messages[0]?.text).toBe("Now Sun 10:00 (was Sat 11:45). Now in Hall C.");
  });

  it("room change: same time, new room", () => {
    const s = rowState({ ...base, venueName: "Hall C", changeKind: "room_change", prevVenueName: "Hall B" }, ctx);
    expect(s.chips).toEqual(["room-change"]);
    expect(s.messages[0]?.text).toBe("Moved to Hall C. Same time, 11:30.");
  });

  it("canceled: can't save; if saved before, it can be removed; never overlaps", () => {
    const c = { ...base, canceled: true };
    const s = rowState(c, { ...ctx, pickReason: "Because you follow Edge AI." });
    expect(s.chips).toEqual(["canceled"]);
    expect(s.messages).toEqual([{ tone: "error", text: "Canceled by the organizer." }]);
    expect(s.save).toBe("cant-save");
    const saved = rowState(c, { ...ctx, saved: true, overlapsWith: ["Privacy by design"] });
    expect(saved.save).toBe("remove");
    expect(saved.overlaps).toBe(false);
  });

  it("adds a checked-in chip", () => {
    expect(rowState(base, { ...ctx, checkedIn: true }).chips).toContain("checked-in");
  });
});
