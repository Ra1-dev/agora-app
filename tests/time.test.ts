import { describe, expect, it } from "vitest";
import { validateSessionTimes } from "@/lib/schedule/validate";
import {
  dayKey,
  eventDays,
  formatAgo,
  formatDateRange,
  formatDay,
  formatDayKey,
  formatTime,
  formatTimeRange,
  formatUpdated,
  formatWeekdayTime,
  zoneOffsetMinutes,
  zonedTimeToUtc,
} from "@/lib/time";

const TZ = "Asia/Almaty"; // UTC+5 since March 2024
const event = { startsOn: "2027-05-14", endsOn: "2027-05-16", timeZone: TZ };

describe("event time zone", () => {
  it("converts event wall time to UTC and back", () => {
    const ms = zonedTimeToUtc("2027-05-15", "11:30", TZ);
    expect(new Date(ms).toISOString()).toBe("2027-05-15T06:30:00.000Z");
    expect(formatTime(ms, TZ)).toBe("11:30");
    expect(zoneOffsetMinutes(ms, TZ)).toBe(300);
  });

  it("uses 24-hour time and the event zone, not the machine zone", () => {
    const ms = Date.UTC(2027, 4, 15, 9, 5); // 14:05 in Astana
    expect(formatTime(ms, TZ)).toBe("14:05");
    expect(formatTime(Date.UTC(2027, 4, 14, 19, 0), TZ)).toBe("00:00");
    expect(formatTimeRange(zonedTimeToUtc("2027-05-15", "11:30", TZ), zonedTimeToUtc("2027-05-15", "12:15", TZ), TZ)).toBe(
      "11:30–12:15",
    );
  });

  it("knows the real weekdays of the event (Fri–Sun)", () => {
    expect(formatDay(zonedTimeToUtc("2027-05-14", "09:00", TZ), TZ)).toBe("Fri, May 14");
    expect(formatDayKey("2027-05-16")).toBe("Sun, May 16");
    expect(formatWeekdayTime(zonedTimeToUtc("2027-05-15", "11:30", TZ), TZ)).toBe("Sat 11:30");
  });

  it("puts late-evening UTC instants on the next event day", () => {
    expect(dayKey(Date.UTC(2027, 4, 14, 20, 0), TZ)).toBe("2027-05-15");
  });

  it("handles a zone with daylight saving time", () => {
    const ny = "America/New_York";
    expect(new Date(zonedTimeToUtc("2027-07-01", "09:00", ny)).toISOString()).toBe("2027-07-01T13:00:00.000Z");
    expect(new Date(zonedTimeToUtc("2027-01-15", "09:00", ny)).toISOString()).toBe("2027-01-15T14:00:00.000Z");
  });

  it("lists event days and formats the date range", () => {
    expect(eventDays("2027-05-14", "2027-05-16")).toEqual(["2027-05-14", "2027-05-15", "2027-05-16"]);
    expect(formatDateRange("2027-05-14", "2027-05-16")).toBe("May 14–16, 2027");
    expect(formatDateRange("2027-05-30", "2027-06-01")).toBe("May 30 – Jun 1, 2027");
  });

  it("formats inbox ages and freshness", () => {
    const now = zonedTimeToUtc("2027-05-15", "11:20", TZ);
    expect(formatAgo(now - 30_000, now, TZ)).toBe("now");
    expect(formatAgo(now - 2 * 60_000, now, TZ)).toBe("2 min");
    expect(formatAgo(now - 3 * 3_600_000, now, TZ)).toBe("3 h");
    expect(formatAgo(zonedTimeToUtc("2027-05-14", "18:00", TZ), now, TZ)).toBe("Yesterday");
    expect(formatUpdated(now - 2 * 60_000, now)).toBe("Updated 2 min ago");
    expect(formatUpdated(now, now)).toBe("Updated just now");
  });
});

describe("validateSessionTimes (DR-02, UC-05)", () => {
  const t = (day: string, time: string) => zonedTimeToUtc(day, time, TZ);

  it("accepts a valid session", () => {
    expect(validateSessionTimes(t("2027-05-15", "14:00"), t("2027-05-15", "14:45"), event)).toBeNull();
  });

  it("rejects end before or equal to start", () => {
    expect(validateSessionTimes(t("2027-05-15", "14:00"), t("2027-05-15", "13:00"), event)?.field).toBe("endsAt");
    expect(validateSessionTimes(t("2027-05-15", "14:00"), t("2027-05-15", "14:00"), event)?.message).toBe(
      "End time must be after the start time.",
    );
  });

  it("rejects sessions outside the event dates, in the event zone", () => {
    const before = validateSessionTimes(t("2027-05-13", "10:00"), t("2027-05-13", "11:00"), event);
    expect(before).toEqual({ field: "startsAt", message: "Pick a time within the event dates, May 14–16, 2027." });
    expect(validateSessionTimes(t("2027-05-16", "23:00"), t("2027-05-17", "00:30"), event)?.field).toBe("endsAt");
    // 00:30 Astana on May 14 is still May 13 in UTC: must be accepted.
    expect(validateSessionTimes(t("2027-05-14", "00:30"), t("2027-05-14", "01:00"), event)).toBeNull();
  });

  it("accepts a session ending exactly at midnight on the last day", () => {
    expect(validateSessionTimes(t("2027-05-16", "23:00"), t("2027-05-17", "00:00"), event)).toBeNull();
  });

  it("rejects missing values", () => {
    expect(validateSessionTimes(Number.NaN, t("2027-05-15", "14:00"), event)?.field).toBe("startsAt");
  });
});
