import { AccessError, requireMember } from "@/lib/auth/current-user";
import { now } from "@/lib/clock";
import { getEventBySlug } from "@/server/events";
import { handle, json, problem } from "@/server/http";
import { SaveError, saveSession, unsaveSession } from "@/server/saves";

type Ctx = { params: Promise<{ slug: string; sessionId: string }> };

async function resolve(ctx: Ctx) {
  const { slug, sessionId } = await ctx.params;
  const event = getEventBySlug(slug);
  if (!event) throw new AccessError(404, "We couldn't find this event.");
  const { viewer } = await requireMember(event.id);
  return { event, viewer, sessionId };
}

/** Save a session to My schedule. */
export const POST = handle(async (_request: Request, ctx: Ctx) => {
  const { event, viewer, sessionId } = await resolve(ctx);
  try {
    const result = saveSession(event.id, viewer.id, sessionId, now());
    return json({ ok: true, saved: true, ...result });
  } catch (error) {
    if (error instanceof SaveError) return problem(409, error.message);
    throw error;
  }
});

/** Remove a session from My schedule. */
export const DELETE = handle(async (_request: Request, ctx: Ctx) => {
  const { event, viewer, sessionId } = await resolve(ctx);
  return json({ ok: true, saved: false, ...unsaveSession(event.id, viewer.id, sessionId) });
});
