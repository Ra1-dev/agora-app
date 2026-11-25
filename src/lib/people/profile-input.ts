// Profile form validation (UC-01): wrong fields are marked and explained next to the field.
import type { Visibility } from "./visibility";

export type ProfileInput = {
  email: string;
  organization: string;
  title: string;
  bio: string;
  skills: string[];
  interests: string[];
  networkingOptIn: boolean;
  visibility: Visibility;
};

export type FieldErrors = Partial<Record<keyof ProfileInput, string>>;

export const LIMITS = { organization: 80, title: 80, bio: 500, skills: 10, skill: 40, interests: 10 } as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Turns "Python, ROS ,, C++" into ["Python", "ROS", "C++"]. */
export function parseList(value: string): string[] {
  const seen = new Set<string>();
  return value
    .split(",")
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter((s) => s && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()));
}

export function validateProfile(input: ProfileInput, knownInterests: readonly string[]): FieldErrors {
  const errors: FieldErrors = {};
  if (!EMAIL.test(input.email.trim())) errors.email = "Enter an email like name@example.com.";
  if (input.organization.length > LIMITS.organization) errors.organization = `Keep it under ${LIMITS.organization} characters.`;
  if (input.title.length > LIMITS.title) errors.title = `Keep it under ${LIMITS.title} characters.`;
  if (input.bio.length > LIMITS.bio) errors.bio = `Keep your bio under ${LIMITS.bio} characters. It's ${input.bio.length} now.`;
  if (input.skills.length > LIMITS.skills) errors.skills = `List up to ${LIMITS.skills} skills.`;
  else if (input.skills.some((s) => s.length > LIMITS.skill)) errors.skills = `Keep each skill under ${LIMITS.skill} characters.`;
  if (input.interests.length > LIMITS.interests) errors.interests = `Pick up to ${LIMITS.interests} interests.`;
  else if (input.interests.some((i) => !knownInterests.includes(i))) errors.interests = "Pick interests from the list.";
  return errors;
}
