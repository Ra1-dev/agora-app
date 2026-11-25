import { now } from "@/lib/clock";
import { memberOf } from "@/server/event-access";
import { handle, json, problem, readJson } from "@/server/http";
import { PeopleError, requestConnection } from "@/server/people";

/** Send a connection request: { userId }. */
export const POST = handle(async (request: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const { event, viewer } = await memberOf((await ctx.params).slug);
  const { userId } = await readJson(request);
  try {
    const connection = requestConnection(event.id, viewer.id, String(userId ?? ""), now());
    return json({ ok: true, connectionId: connection.id, status: connection.status });
  } catch (error) {
    if (error instanceof PeopleError) return problem(409, error.message);
    throw error;
  }
});
