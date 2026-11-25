import { now } from "@/lib/clock";
import { organizerOf } from "@/server/desk-access";
import { handle, json, problem, readJson } from "@/server/http";
import { changeSession, DeskError } from "@/server/organizer";

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Change a session's time and room (UC-05): { date, start, end, venueId }. */
export const PATCH = handle(async (request: Request, ctx: { params: Promise<{ slug: string; id: string }> }) => {
  const { slug, id } = await ctx.params;
  const { event } = await organizerOf(slug);
  const body = await readJson(request);
  try {
    const result = changeSession(event, id, { date: str(body.date), start: str(body.start), end: str(body.end), venueId: str(body.venueId) }, now());
    return json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof DeskError) return problem(422, error.message, error.field);
    throw error;
  }
});
