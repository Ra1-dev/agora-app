// Event time helpers. Instants are epoch ms (UTC); everything shown is in the event's time zone, 24-hour.
// No date library: Intl does the zone maths.

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${timeZone}|${JSON.stringify(options)}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone, ...options });
    formatters.set(key, f);
  }
  return f;
}

export type ZonedParts = {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number; // 0–23
  minute: number;
  weekday: string; // "Sat"
};

export function zonedParts(ms: number, timeZone: string): ZonedParts {
  const parts = formatter(timeZone, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")) % 24,
    minute: Number(get("minute")),
    weekday: get("weekday"),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Offset of the zone from UTC at that instant, in minutes (Asia/Almaty: +300). */
export function zoneOffsetMinutes(ms: number, timeZone: string): number {
  const p = zonedParts(ms, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return Math.round((asUtc - Math.floor(ms / 60_000) * 60_000) / 60_000);
}

/** "2027-05-15" + "11:30" in the event zone → epoch ms. */
export function zonedTimeToUtc(dateKey: string, time: string, timeZone: string): number {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  const t = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!d || !t) throw new Error(`Bad date or time: ${dateKey} ${time}`);
  const wall = Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(t[1]), Number(t[2]));
  // Two passes settle the offset around DST changes.
  let guess = wall - zoneOffsetMinutes(wall, timeZone) * 60_000;
  guess = wall - zoneOffsetMinutes(guess, timeZone) * 60_000;
  return guess;
}

/** "2027-05-15" in the event zone. */
export function dayKey(ms: number, timeZone: string): string {
  const p = zonedParts(ms, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** "11:30" */
export function formatTime(ms: number, timeZone: string): string {
  const p = zonedParts(ms, timeZone);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** "11:30–12:15" */
export function formatTimeRange(startsAt: number, endsAt: number, timeZone: string): string {
  return `${formatTime(startsAt, timeZone)}–${formatTime(endsAt, timeZone)}`;
}

/** "Sat, May 15" */
export function formatDay(ms: number, timeZone: string): string {
  return formatter(timeZone, { weekday: "short", month: "short", day: "numeric" }).format(new Date(ms));
}

/** "Sat, May 15" for a date key, independent of any instant. */
export function formatDayKey(key: string): string {
  return formatDay(zonedTimeToUtc(key, "12:00", "UTC"), "UTC");
}

/** "Sat 11:30", as in "Canceled: Small models on the edge, Sat 11:30." */
export function formatWeekdayTime(ms: number, timeZone: string): string {
  const p = zonedParts(ms, timeZone);
  return `${p.weekday} ${pad(p.hour)}:${pad(p.minute)}`;
}

/** Every date key from startsOn to endsOn inclusive ("2027-05-14" … "2027-05-16"). */
export function eventDays(startsOn: string, endsOn: string): string[] {
  const days: string[] = [];
  let cursor = Date.UTC(Number(startsOn.slice(0, 4)), Number(startsOn.slice(5, 7)) - 1, Number(startsOn.slice(8, 10)));
  const last = Date.UTC(Number(endsOn.slice(0, 4)), Number(endsOn.slice(5, 7)) - 1, Number(endsOn.slice(8, 10)));
  while (cursor <= last) {
    days.push(new Date(cursor).toISOString().slice(0, 10));
    cursor += 86_400_000;
  }
  return days;
}

/** "May 14–16, 2027" or "May 30 – Jun 1, 2027". */
export function formatDateRange(startsOn: string, endsOn: string): string {
  const fmt = (key: string, opts: Intl.DateTimeFormatOptions) =>
    formatter("UTC", opts).format(new Date(zonedTimeToUtc(key, "12:00", "UTC")));
  const year = endsOn.slice(0, 4);
  if (startsOn === endsOn) return `${fmt(startsOn, { month: "short", day: "numeric" })}, ${year}`;
  if (startsOn.slice(0, 7) === endsOn.slice(0, 7)) {
    return `${fmt(startsOn, { month: "short", day: "numeric" })}–${Number(endsOn.slice(8, 10))}, ${year}`;
  }
  return `${fmt(startsOn, { month: "short", day: "numeric" })} – ${fmt(endsOn, { month: "short", day: "numeric" })}, ${year}`;
}

/** Inbox and freshness labels: "now", "2 min", "1 h", "Yesterday", "Sat, May 15". */
export function formatAgo(ms: number, now: number, timeZone: string): string {
  const minutes = Math.floor((now - ms) / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes} min`;
  if (dayKey(ms, timeZone) === dayKey(now, timeZone)) return `${Math.floor(minutes / 60)} h`;
  if (dayKey(ms + 86_400_000, timeZone) === dayKey(now, timeZone)) return "Yesterday";
  return formatDay(ms, timeZone);
}

/** "Updated 2 min ago" / "Updated just now" (UC-06 freshness). */
export function formatUpdated(ms: number, now: number): string {
  const minutes = Math.floor((now - ms) / 60_000);
  if (minutes < 1) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `Updated ${hours} h ago`;
}
