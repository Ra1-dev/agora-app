import { currentUser } from "@/lib/auth/current-user";
import { now } from "@/lib/clock";
import { DEMO_EVENT_SLUG } from "@/lib/demo";
import { ensureMembership, getEventByCode, getEventBySlug } from "@/server/events";
import { handle, json, problem, readJson } from "@/server/http";

/**
 * Join with an event code. In the demo any code works: a known code opens its event,
 * anything else opens the demo event.
 */
export const POST = handle(async (request: Request) => {
  const { code } = await readJson(request);
  const value = typeof code === "string" ? code.trim() : "";
  if (!value) return problem(400, "Enter the event code from your badge or invitation.", "code");

  const event = getEventByCode(value) ?? getEventBySlug(DEMO_EVENT_SLUG);
  if (!event) return problem(404, "We couldn't find that event. Check the code and try again.", "code");

  const viewer = await currentUser("participant");
  ensureMembership(event.id, viewer.id, now());
  return json({ ok: true, slug: event.slug });
});
