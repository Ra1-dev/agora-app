import { now, setClock } from "@/lib/clock";
import { DEMO_CLOCK_START, DEMO_EVENT_SLUG } from "@/lib/demo";
import { zonedTimeToUtc } from "@/lib/time";
import { getEventBySlug } from "@/server/events";
import { handle, json, problem, readJson } from "@/server/http";

export const dynamic = "force-dynamic";

export const GET = handle(async () => json({ now: now() }));

/** Moves the demo clock: { action: "reset" } or { action: "set", date: "2027-05-15", time: "14:00" }. */
export const POST = handle(async (request: Request) => {
  const body = await readJson(request);
  const event = getEventBySlug(DEMO_EVENT_SLUG);
  if (!event) return problem(404, "The demo event is missing. Run npm run db:seed.");

  if (body.action === "reset") {
    setClock(zonedTimeToUtc(DEMO_CLOCK_START.date, DEMO_CLOCK_START.time, event.timeZone));
    return json({ now: now() });
  }
  if (body.action === "set") {
    const date = typeof body.date === "string" ? body.date : "";
    const time = typeof body.time === "string" ? body.time : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return problem(400, "Pick a day.", "date");
    if (!/^\d{1,2}:\d{2}$/.test(time)) return problem(400, "Enter a time like 14:00.", "time");
    setClock(zonedTimeToUtc(date, time, event.timeZone));
    return json({ now: now() });
  }
  return problem(400, "Unknown clock action.");
});
