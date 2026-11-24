// Fixed facts about the local demo installation (one seeded event, no sign-in).

export const DEMO_EVENT_ID = "ev_steppe27";
export const DEMO_EVENT_SLUG = "steppe-ai-2027";

/** Demo clock start: Saturday of the event, mid-morning, so "Live now" and "Up next" have content. */
export const DEMO_CLOCK_START = { date: "2027-05-15", time: "11:20" } as const;

/** People offered in "Viewing as" on participant screens; the first is the default. */
export const VIEWING_AS_PARTICIPANT_IDS = ["u_dana", "u_aruzhan", "u_ruslan"] as const;
export const DEFAULT_PARTICIPANT_ID = VIEWING_AS_PARTICIPANT_IDS[0];

/** The organizer account used on the organizer desk. */
export const DEMO_ORGANIZER_ID = "u_organizer";
