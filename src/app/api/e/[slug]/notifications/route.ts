import { toLive } from "@/lib/notifications/present";
import { memberOf } from "@/server/event-access";
import { handle, json } from "@/server/http";
import { listNotifications, notificationsSince } from "@/server/notify";

/** Notifications for the viewer; `?since=<id>` returns only what came after (FR-21, for polling clients). */
export const GET = handle(async (request: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const { event, viewer } = await memberOf((await ctx.params).slug);
  const since = Number(new URL(request.url).searchParams.get("since") ?? 0) || 0;
  const rows = since > 0 ? notificationsSince(event.id, viewer.id, since, 200) : listNotifications(event.id, viewer.id);
  return json({ notifications: rows.map((n) => ({ ...toLive(event.slug, n), readAt: n.readAt })) });
});
