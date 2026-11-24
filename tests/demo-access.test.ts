import { describe, expect, it } from "vitest";
import { allowedViewerIds, VIEWER_COOKIES } from "@/lib/auth/current-user";
import { clockNow, parseClockSetting } from "@/lib/clock";
import { DEFAULT_PARTICIPANT_ID, DEMO_ORGANIZER_ID } from "@/lib/demo";

describe("Viewing as", () => {
  it("offers only participants on participant screens, with Dana first", () => {
    const ids = allowedViewerIds("participant");
    expect(ids[0]).toBe(DEFAULT_PARTICIPANT_ID);
    expect(ids).toEqual(["u_dana", "u_aruzhan", "u_ruslan"]);
    expect(ids).not.toContain(DEMO_ORGANIZER_ID);
  });

  it("offers the organizer first on the desk, plus participants to show access denial", () => {
    const ids = allowedViewerIds("desk");
    expect(ids[0]).toBe(DEMO_ORGANIZER_ID);
    expect(ids).toContain("u_dana");
  });

  it("keeps separate cookies so two tabs can be organizer and participant", () => {
    expect(VIEWER_COOKIES.participant).not.toBe(VIEWER_COOKIES.desk);
  });
});

describe("demo clock", () => {
  it("moves in real time from the set moment", () => {
    const setting = { virtualAt: 1_000_000, realAt: 50_000 };
    expect(clockNow(setting, 50_000)).toBe(1_000_000);
    expect(clockNow(setting, 110_000)).toBe(1_060_000);
  });

  it("ignores a missing or broken setting", () => {
    expect(parseClockSetting(undefined)).toBeNull();
    expect(parseClockSetting("not json")).toBeNull();
    expect(parseClockSetting('{"virtualAt":"x"}')).toBeNull();
    expect(parseClockSetting('{"virtualAt":1,"realAt":2}')).toEqual({ virtualAt: 1, realAt: 2 });
  });
});
