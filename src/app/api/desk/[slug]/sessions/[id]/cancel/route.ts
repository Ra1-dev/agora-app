import { now } from "@/lib/clock";
import { organizerOf } from "@/server/desk-access";
import { handle, json, problem } from "@/server/http";
import { cancelSession, DeskError } from "@/server/organizer";

/** Cancel a session (FR-06). */
export const POST = handle(async (_request: Request, ctx: { params: Promise<{ slug: string; id: string }> }) => {
  const { slug, id } = await ctx.params;
  const { event } = await organizerOf(slug);
  try {
    return json({ ok: true, ...cancelSession(event, id, now()) });
  } catch (error) {
    if (error instanceof DeskError) return problem(409, error.message);
    throw error;
  }
});
