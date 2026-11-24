// Session time validation (DR-02, UC-05): start before end, inside the event dates (event time zone).
import { dayKey, formatDateRange } from "../time";

export type EventWindow = {
  startsOn: string; // "2027-05-14"
  endsOn: string; // "2027-05-16"
  timeZone: string;
};

export type TimeError = { field: "startsAt" | "endsAt"; message: string };

export function validateSessionTimes(startsAt: number, endsAt: number, event: EventWindow): TimeError | null {
  if (!Number.isFinite(startsAt)) return { field: "startsAt", message: "Enter a start time." };
  if (!Number.isFinite(endsAt)) return { field: "endsAt", message: "Enter an end time." };
  if (startsAt >= endsAt) return { field: "endsAt", message: "End time must be after the start time." };

  const dates = formatDateRange(event.startsOn, event.endsOn);
  const startDay = dayKey(startsAt, event.timeZone);
  // A session ending exactly at midnight still belongs to the previous day.
  const endDay = dayKey(endsAt - 1, event.timeZone);
  if (startDay < event.startsOn || startDay > event.endsOn) {
    return { field: "startsAt", message: `Pick a time within the event dates, ${dates}.` };
  }
  if (endDay > event.endsOn) {
    return { field: "endsAt", message: `Pick a time within the event dates, ${dates}.` };
  }
  return null;
}
