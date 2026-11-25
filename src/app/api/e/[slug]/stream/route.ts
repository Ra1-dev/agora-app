import { AccessError } from "@/lib/auth/current-user";
import { now } from "@/lib/clock";
import { toLive } from "@/lib/notifications/present";
import { memberOf } from "@/server/event-access";
import { subscribe, type LiveEvent } from "@/server/live/bus";
import { markDelivered, notificationsByIds, notificationsSince } from "@/server/notify";
import { checkStartsSoon } from "@/server/reminders";
import { problem } from "@/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEARTBEAT_MS = 20_000;

/**
 * Live updates for one participant tab (Server-Sent Events).
 * - `notification`: a stored notification for this person (id = notification id, so the browser's
 *   Last-Event-ID lets a reconnecting tab catch up on what it missed, FR-21).
 * - `program`: a session changed; the tab refreshes what it shows.
 * - `clock`: the demo clock moved.
 */
export async function GET(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  let event;
  let viewer;
  try {
    ({ event, viewer } = await memberOf((await ctx.params).slug));
  } catch (error) {
    if (error instanceof AccessError) return problem(error.status, error.message);
    throw error;
  }

  const url = new URL(request.url);
  const lastEventId = Number(request.headers.get("last-event-id") ?? url.searchParams.get("since") ?? 0) || 0;
  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const write = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      const sendNotifications = (ids: number[] | null, sinceId?: number) => {
        const rows = ids ? notificationsByIds(ids) : notificationsSince(event.id, viewer.id, sinceId ?? 0);
        if (rows.length === 0) return 0;
        for (const n of rows) write(`id: ${n.id}\nevent: notification\ndata: ${JSON.stringify(toLive(event.slug, n))}\n\n`);
        markDelivered(rows.map((n) => n.id), now());
        return rows.length;
      };

      write(`retry: 3000\n\n`);
      // Catch up on what this tab missed while it was away.
      const missed = lastEventId > 0 ? sendNotifications(null, lastEventId) : 0;
      write(`event: ready\ndata: ${JSON.stringify({ missed })}\n\n`);
      checkStartsSoon(event.id, viewer.id, now());

      const unsubscribe = subscribe((e: LiveEvent) => {
        if (e.type === "notifications" && e.eventId === event.id) {
          const ids = e.byUser[viewer.id];
          if (ids?.length) sendNotifications(ids);
        } else if (e.type === "program" && e.eventId === event.id) {
          write(`event: program\ndata: ${JSON.stringify({ sessionId: e.sessionId, change: e.change })}\n\n`);
        } else if (e.type === "clock") {
          checkStartsSoon(event.id, viewer.id, now());
          write(`event: clock\ndata: {}\n\n`);
        }
      });
      const heartbeat = setInterval(() => {
        checkStartsSoon(event.id, viewer.id, now());
        write(`: ping\n\n`);
      }, HEARTBEAT_MS);

      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      request.signal.addEventListener("abort", () => cleanup());
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
