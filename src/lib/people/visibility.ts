// Per-field visibility (FR-08, FR-09). The name is always shown; every other field only if its owner opened it.
import { joinList } from "../text";

export const PROFILE_FIELDS = ["organization", "title", "interests", "bio", "skills"] as const;
export type ProfileField = (typeof PROFILE_FIELDS)[number];

export type Visibility = Record<ProfileField, boolean>;

export type Profile = {
  userId: string | number;
  name: string;
  organization: string | null;
  title: string | null;
  bio: string | null;
  skills: readonly string[];
  interests: readonly string[];
  networkingOptIn: boolean;
  visibility: Visibility;
};

export type PublicProfile = {
  userId: Profile["userId"];
  name: string;
  organization?: string;
  title?: string;
  bio?: string;
  skills?: readonly string[];
  interests?: readonly string[];
  networkingOptIn: boolean;
};

/** What `viewer` may see of `profile`. Owners see everything. */
export function visibleProfile(profile: Profile, viewerId: Profile["userId"]): PublicProfile {
  const self = viewerId === profile.userId;
  const show = (field: ProfileField) => self || profile.visibility[field];
  const out: PublicProfile = { userId: profile.userId, name: profile.name, networkingOptIn: profile.networkingOptIn };
  if (show("organization") && profile.organization) out.organization = profile.organization;
  if (show("title") && profile.title) out.title = profile.title;
  if (show("bio") && profile.bio) out.bio = profile.bio;
  if (show("skills") && profile.skills.length) out.skills = profile.skills;
  if (show("interests") && profile.interests.length) out.interests = profile.interests;
  return out;
}

const FIELD_WORDS: Record<ProfileField, string> = {
  organization: "organization",
  title: "role",
  interests: "interests",
  bio: "bio",
  skills: "skills",
};

/** Plain-words privacy line (voice §4): "Others see your name, organization and interests. Your bio is hidden. Change this in Profile." */
export function privacySummary(visibility: Visibility): string {
  const shown = PROFILE_FIELDS.filter((f) => visibility[f]).map((f) => FIELD_WORDS[f]);
  const hidden = PROFILE_FIELDS.filter((f) => !visibility[f]).map((f) => FIELD_WORDS[f]);
  const parts = [`Others see your ${joinList(["name", ...shown])}.`];
  if (hidden.length === 1) parts.push(`Your ${hidden[0]} is hidden.`);
  else if (hidden.length > 1) parts.push(`Your ${joinList(hidden)} are hidden.`);
  parts.push("Change this in Profile.");
  return parts.join(" ");
}
