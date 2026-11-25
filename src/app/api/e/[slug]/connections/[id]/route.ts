import { now } from "@/lib/clock";
import { memberOf } from "@/server/event-access";
import { handle, json, problem, readJson } from "@/server/http";
import { PeopleError, respondToConnection } from "@/server/people";

/** Answer a connection request: { action: "accept" | "decline" }. */
export const POST = handle(async (request: Request, ctx: { params: Promise<{ slug: string; id: string }> }) => {
  const { slug, id } = await ctx.params;
  const { event, viewer } = await memberOf(slug);
  const { action } = await readJson(request);
  if (action !== "accept" && action !== "decline") return problem(400, "Accept or decline the request.");
  try {
    return json({ ok: true, ...respondToConnection(event.id, id, viewer.id, action === "accept", now()) });
  } catch (error) {
    if (error instanceof PeopleError) return problem(409, error.message);
    throw error;
  }
});
