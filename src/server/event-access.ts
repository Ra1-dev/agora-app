// Shared start of participant API handlers: find the event and check membership.
import { AccessError, requireMember } from "@/lib/auth/current-user";
import { getEventBySlug } from "./events";

export async function memberOf(slug: string) {
  const event = getEventBySlug(slug);
  if (!event) throw new AccessError(404, "We couldn't find this event.");
  const { viewer } = await requireMember(event.id);
  return { event, viewer };
}
