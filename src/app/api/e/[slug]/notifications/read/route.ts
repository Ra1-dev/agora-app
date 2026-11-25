import { now } from "@/lib/clock";
import { memberOf } from "@/server/event-access";
import { handle, json, readJson } from "@/server/http";
import { markRead } from "@/server/notify";

/** Mark notifications read: { ids: number[] } or { all: true }. */
export const POST = handle(async (request: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const { event, viewer } = await memberOf((await ctx.params).slug);
  const body = await readJson(request);
  const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Number.isFinite) : undefined;
  const changed = markRead(event.id, viewer.id, now(), body.all === true ? undefined : (ids ?? []));
  return json({ ok: true, changed });
});
