// "Who is this" for the demo. There is no sign-in: a "Viewing as" cookie picks the person.
// Every identity and permission check goes through this file, so real auth can replace it later.
import { and, eq, inArray } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db/client";
import { memberships, profiles, users } from "@/db/schema";
import { DEFAULT_PARTICIPANT_ID, DEMO_ORGANIZER_ID, VIEWING_AS_PARTICIPANT_IDS } from "@/lib/demo";

/**
 * Participant screens and the organizer desk keep separate identities, so one browser can show
 * the organizer in one tab and a participant in another (the UC-05 demo).
 */
export type Surface = "participant" | "desk";

export const VIEWER_COOKIES: Record<Surface, string> = {
  participant: "agora_viewer",
  desk: "agora_desk_viewer",
};

const DEFAULTS: Record<Surface, string> = {
  participant: DEFAULT_PARTICIPANT_ID,
  desk: DEMO_ORGANIZER_ID,
};

/** Who may be picked in "Viewing as" on each surface. */
export function allowedViewerIds(surface: Surface): readonly string[] {
  return surface === "participant"
    ? VIEWING_AS_PARTICIPANT_IDS
    : [DEMO_ORGANIZER_ID, ...VIEWING_AS_PARTICIPANT_IDS];
}

export type Viewer = {
  id: string;
  name: string;
  title: string | null;
  organization: string | null;
  surface: Surface;
};

export type Role = "participant" | "organizer";

function loadViewers(ids: readonly string[]) {
  return getDb()
    .select({ id: users.id, name: users.name, title: profiles.title, organization: profiles.organization })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(inArray(users.id, [...ids]))
    .all();
}

/** The person this request acts as, on the given surface. */
export async function currentUser(surface: Surface): Promise<Viewer> {
  const requested = (await cookies()).get(VIEWER_COOKIES[surface])?.value;
  const allowed = allowedViewerIds(surface);
  const id = requested && allowed.includes(requested) ? requested : DEFAULTS[surface];
  const row = loadViewers([id])[0];
  if (!row) throw new Error(`Demo user ${id} is missing. Run \`npm run db:seed\`.`);
  return { ...row, surface };
}

/** The options shown in "Viewing as", in menu order. */
export function viewingAsOptions(surface: Surface): Viewer[] {
  const ids = allowedViewerIds(surface);
  const rows = loadViewers(ids);
  return ids.flatMap((id) => {
    const row = rows.find((r) => r.id === id);
    return row ? [{ ...row, surface }] : [];
  });
}

/** The person's role in an event, or null when they are not a member (DR-01). */
export function roleIn(eventId: string, userId: string): Role | null {
  const row = getDb()
    .select({ role: memberships.role })
    .from(memberships)
    .where(and(eq(memberships.eventId, eventId), eq(memberships.userId, userId)))
    .get();
  return row?.role ?? null;
}

export class AccessError extends Error {
  constructor(
    readonly status: 401 | 403 | 404,
    message: string,
  ) {
    super(message);
    this.name = "AccessError";
  }
}

/** Members only: participant screens and participant APIs. */
export async function requireMember(eventId: string): Promise<{ viewer: Viewer; role: Role }> {
  const viewer = await currentUser("participant");
  const role = roleIn(eventId, viewer.id);
  if (!role) throw new AccessError(403, "You're not registered for this event. Join with an event code first.");
  return { viewer, role };
}

/** Organizers of this event only: the organizer desk and its APIs (UC-05, UC-06). */
export async function requireOrganizer(eventId: string): Promise<Viewer> {
  const viewer = await currentUser("desk");
  if (roleIn(eventId, viewer.id) !== "organizer") {
    throw new AccessError(403, "Only this event's organizers can see its stats.");
  }
  return viewer;
}
