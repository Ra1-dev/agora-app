// What the People screens show for each person, from the viewer's side.
import { suggestPeople, sharedVisibleInterests } from "@/lib/people/suggest";
import { visibleProfile, type Profile, type PublicProfile } from "@/lib/people/visibility";
import { firstName, joinList } from "@/lib/text";
import type { PersonState } from "@/app/e/[slug]/people/PersonActions";
import { connectionsFor, listedParticipants, type ConnectionView } from "./people";

export type PersonCard = {
  profile: PublicProfile;
  /** One line under the name: the reason ("You both follow …") or the status. */
  line: { text: string; tone: "accent" | "muted" } | null;
  state: PersonState;
  connection: ConnectionView | undefined;
};

export function peopleContext(eventId: string, viewer: Profile) {
  const everyone = listedParticipants(eventId).filter((p) => p.userId !== viewer.userId);
  const connections = connectionsFor(eventId, String(viewer.userId));
  const byOther = new Map(connections.map((c) => [c.otherId, c]));
  return { everyone, connections, byOther };
}

/** Builds a person card: visible fields only, reason from shared visible interests (FR-09, FR-16). */
export function personCard(viewer: Profile, other: Profile, connection: ConnectionView | undefined): PersonCard {
  const profile = visibleProfile(other, viewer.userId);
  const name = firstName(other.name);
  const shared = viewer.interests.length ? sharedVisibleInterests(viewer.interests, other) : [];
  const reason = shared.length ? `You both follow ${joinList(shared)}.` : null;

  let state: PersonState = { kind: "none" };
  let line: PersonCard["line"] = reason ? { text: reason, tone: "accent" } : null;

  if (connection?.status === "accepted") {
    state = { kind: "message", connectionId: connection.id };
  } else if (connection?.status === "pending" && connection.direction === "incoming") {
    state = viewer.networkingOptIn ? { kind: "incoming", connectionId: connection.id, name } : { kind: "none" };
    line = { text: reason ? `Wants to connect. ${reason}` : "Wants to connect.", tone: "accent" };
  } else if (connection?.status === "pending") {
    state = { kind: "requested" };
    line = { text: `You can message once ${name} accepts your request.`, tone: "muted" };
  } else if (!other.networkingOptIn) {
    line = { text: "Not open to networking", tone: "muted" };
  } else if (viewer.networkingOptIn && connection?.status !== "declined") {
    state = { kind: "connect", userId: other.userId as string, name };
  }
  return { profile, line, state, connection };
}

export function suggestionsFor(viewer: Profile, everyone: Profile[], byOther: Map<string, ConnectionView>) {
  if (!viewer.networkingOptIn) return [];
  return suggestPeople({
    viewerId: viewer.userId,
    viewerInterests: viewer.interests,
    candidates: everyone,
    excludeIds: new Set(byOther.keys()),
    limit: 6,
  });
}
