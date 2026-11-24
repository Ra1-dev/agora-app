import { currentUser, viewingAsOptions, type Surface } from "@/lib/auth/current-user";
import { now } from "@/lib/clock";
import { DEMO_EVENT_SLUG, DEMO_ORGANIZER_ID } from "@/lib/demo";
import { getThemeChoice } from "@/lib/theme";
import { eventDays, formatDayKey } from "@/lib/time";
import { getEventBySlug } from "@/server/events";
import { ViewingAsMenu } from "./ViewingAsMenu";

/** Server wrapper: loads who we are viewing as, the options, the theme and the demo clock. */
export async function ViewingAs({ surface, eventSlug = DEMO_EVENT_SLUG }: { surface: Surface; eventSlug?: string }) {
  const [viewer, theme] = await Promise.all([currentUser(surface), getThemeChoice()]);
  const options = viewingAsOptions(surface);
  const organizer = viewingAsOptions("desk").find((p) => p.id === DEMO_ORGANIZER_ID)!;
  const event = getEventBySlug(eventSlug);
  const timeZone = event?.timeZone ?? "UTC";
  const days = event ? eventDays(event.startsOn, event.endsOn).map((key) => ({ key, label: formatDayKey(key) })) : [];

  return (
    <ViewingAsMenu
      surface={surface}
      viewer={viewer}
      options={options}
      organizer={organizer}
      deskHref={`/desk/${eventSlug}`}
      participantHref={`/e/${eventSlug}`}
      theme={theme}
      clock={{ now: now(), timeZone, city: event?.city ?? "", days }}
    />
  );
}
