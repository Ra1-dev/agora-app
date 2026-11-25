// Shared start of organizer API handlers: find the event and check the organizer role.
import { AccessError, requireOrganizer } from "@/lib/auth/current-user";
import { getEventBySlug } from "./events";

export async function organizerOf(slug: string) {
  const event = getEventBySlug(slug);
  if (!event) throw new AccessError(404, "We couldn't find this event.");
  const organizer = await requireOrganizer(event.id);
  return { event, organizer };
}
