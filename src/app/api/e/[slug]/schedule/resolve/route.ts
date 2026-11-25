import { AccessError, requireMember } from "@/lib/auth/current-user";
import { getEventBySlug } from "@/server/events";
import { handle, json, problem, readJson } from "@/server/http";
import { ResolveError, resolveOverlap } from "@/server/schedule";

type Ctx = { params: Promise<{ slug: string }> };

/** Keep one of two overlapping sessions: { keep, remove }. */
export const POST = handle(async (request: Request, ctx: Ctx) => {
  const event = getEventBySlug((await ctx.params).slug);
  if (!event) throw new AccessError(404, "We couldn't find this event.");
  const { viewer } = await requireMember(event.id);
  const { keep, remove } = await readJson(request);
  try {
    resolveOverlap(event.id, viewer.id, String(keep ?? ""), String(remove ?? ""));
  } catch (error) {
    if (error instanceof ResolveError) return problem(409, error.message);
    throw error;
  }
  return json({ ok: true, kept: keep, removed: remove });
});
