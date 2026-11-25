import { AccessError, requireMember } from "@/lib/auth/current-user";
import { now } from "@/lib/clock";
import { sessionIcs } from "@/lib/ics";
import { getEventBySlug } from "@/server/events";
import { handle } from "@/server/http";
import { loadProgram } from "@/server/program";

type Ctx = { params: Promise<{ slug: string; id: string }> };

/** "Add to calendar": an .ics file for one session. */
export const GET = handle(async (request: Request, ctx: Ctx) => {
  const { slug, id } = await ctx.params;
  const event = getEventBySlug(slug);
  if (!event) throw new AccessError(404, "We couldn't find this event.");
  await requireMember(event.id);
  const session = loadProgram(event).byId.get(id);
  if (!session) throw new AccessError(404, "This session isn't in the program.");

  const body = sessionIcs({
    uid: `${session.id}@${event.slug}.agora.local`,
    title: `${session.title} · ${event.name}`,
    description: session.abstract,
    location: `${session.venue.name}, ${event.venueName}, ${event.city}`,
    startsAt: session.startsAt,
    endsAt: session.endsAt,
    createdAt: now(),
    url: new URL(`/e/${event.slug}/sessions/${session.id}`, request.url).toString(),
  });
  return new Response(body, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${session.id.replace(/^se_/, "")}.ics"`,
    },
  });
});
