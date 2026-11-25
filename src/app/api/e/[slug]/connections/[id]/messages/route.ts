import { now } from "@/lib/clock";
import { memberOf } from "@/server/event-access";
import { handle, json, problem, readJson } from "@/server/http";
import { getConnection, listMessages, PeopleError, sendMessage } from "@/server/people";

type Ctx = { params: Promise<{ slug: string; id: string }> };

/** The conversation, for the two people in it only (UC-04). */
export const GET = handle(async (_request: Request, ctx: Ctx) => {
  const { slug, id } = await ctx.params;
  const { event, viewer } = await memberOf(slug);
  const connection = getConnection(event.id, id, viewer.id);
  if (connection.status !== "accepted") return json({ messages: [] });
  return json({ messages: listMessages(connection.id) });
});

/** Send a message: { body }. Only after the request was accepted (DR-05). */
export const POST = handle(async (request: Request, ctx: Ctx) => {
  const { slug, id } = await ctx.params;
  const { event, viewer } = await memberOf(slug);
  const { body } = await readJson(request);
  try {
    return json({ ok: true, message: sendMessage(event.id, id, viewer.id, String(body ?? ""), now()) });
  } catch (error) {
    if (error instanceof PeopleError) return problem(409, error.message, "body");
    throw error;
  }
});
