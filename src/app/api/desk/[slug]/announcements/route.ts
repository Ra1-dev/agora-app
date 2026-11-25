import { now } from "@/lib/clock";
import { organizerOf } from "@/server/desk-access";
import { handle, json, problem, readJson } from "@/server/http";
import { DeskError, publishAnnouncement } from "@/server/organizer";

/** Publish an announcement to everyone at the event (FR-07): { body }. */
export const POST = handle(async (request: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const { event, organizer } = await organizerOf((await ctx.params).slug);
  const { body } = await readJson(request);
  try {
    return json({ ok: true, ...publishAnnouncement(event, organizer.id, typeof body === "string" ? body : "", now()) });
  } catch (error) {
    if (error instanceof DeskError) return problem(422, error.message, error.field);
    throw error;
  }
});
