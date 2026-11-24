import { describe, expect, it } from "vitest";
import { findOverlaps, overlapIndex, overlapMinutes, overlaps } from "@/lib/schedule/overlaps";
import { zonedTimeToUtc } from "@/lib/time";

const TZ = "Asia/Almaty";
const at = (time: string, day = "2027-05-15") => zonedTimeToUtc(day, time, TZ);
const s = (id: string, start: string, end: string, extra: { canceled?: boolean; day?: string } = {}) => ({
  id,
  startsAt: at(start, extra.day),
  endsAt: at(end, extra.day),
  canceled: extra.canceled,
});

describe("overlaps (DR-03)", () => {
  it("detects partial overlap and its length", () => {
    const edge = s("edge", "11:30", "12:15");
    const privacy = s("privacy", "11:45", "12:30");
    expect(overlaps(edge, privacy)).toBe(true);
    expect(overlaps(privacy, edge)).toBe(true);
    expect(overlapMinutes(edge, privacy)).toBe(30);
  });

  it("does not treat back-to-back sessions as overlapping", () => {
    const a = s("a", "10:00", "11:00");
    const b = s("b", "11:00", "12:00");
    expect(overlaps(a, b)).toBe(false);
    expect(findOverlaps([a, b])).toEqual([]);
  });

  it("detects containment and identical slots", () => {
    const outer = s("outer", "09:00", "12:00");
    const inner = s("inner", "10:00", "10:30");
    const same = s("same", "09:00", "12:00");
    expect(overlapMinutes(outer, inner)).toBe(30);
    expect(overlapMinutes(outer, same)).toBe(180);
    expect(findOverlaps([inner, outer, same]).length).toBe(3);
  });

  it("separates days and ignores one-minute gaps", () => {
    const fri = s("fri", "11:30", "12:15", { day: "2027-05-14" });
    const sat = s("sat", "11:30", "12:15");
    const gap = s("gap", "12:16", "13:00");
    expect(findOverlaps([fri, sat, gap])).toEqual([]);
  });

  it("ignores canceled sessions", () => {
    const a = s("a", "11:30", "12:15");
    const b = s("b", "11:45", "12:30", { canceled: true });
    expect(findOverlaps([a, b])).toEqual([]);
  });

  it("returns pairs in start order and finds chains", () => {
    const a = s("a", "09:00", "10:00");
    const b = s("b", "09:30", "11:00");
    const c = s("c", "10:30", "11:30");
    const pairs = findOverlaps([c, b, a]).map((p) => [p.a.id, p.b.id, p.minutes]);
    expect(pairs).toEqual([
      ["a", "b", 30],
      ["b", "c", 30],
    ]);
    const index = overlapIndex([a, b, c]);
    expect(index.get("b")).toEqual(["a", "c"]);
    expect(index.get("a")).toEqual(["b"]);
  });

  it("handles an empty or single schedule", () => {
    expect(findOverlaps([])).toEqual([]);
    expect(findOverlaps([s("a", "09:00", "10:00")])).toEqual([]);
  });
});
