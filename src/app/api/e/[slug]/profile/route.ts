import { now } from "@/lib/clock";
import { parseList, validateProfile, type ProfileInput } from "@/lib/people/profile-input";
import { memberOf } from "@/server/event-access";
import { handle, json, readJson } from "@/server/http";
import { allInterests, emailTaken, updateProfile } from "@/server/people";

const bool = (v: unknown) => v === true;
const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Save your own profile. Field errors come back as { errors: { field: message } }. */
export const PATCH = handle(async (request: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const { viewer } = await memberOf((await ctx.params).slug);
  const body = await readJson(request);
  const visibility = (body.visibility ?? {}) as Record<string, unknown>;
  const input: ProfileInput = {
    email: str(body.email),
    organization: str(body.organization),
    title: str(body.title),
    bio: str(body.bio),
    skills: Array.isArray(body.skills) ? body.skills.map(str).filter(Boolean) : parseList(str(body.skills)),
    interests: Array.isArray(body.interests) ? body.interests.map(str) : [],
    networkingOptIn: bool(body.networkingOptIn),
    visibility: {
      organization: bool(visibility.organization),
      title: bool(visibility.title),
      interests: bool(visibility.interests),
      bio: bool(visibility.bio),
      skills: bool(visibility.skills),
    },
  };
  const errors = validateProfile(input, allInterests());
  if (!errors.email && emailTaken(input.email, viewer.id)) errors.email = "Someone at this event already uses this email.";
  if (Object.keys(errors).length) return json({ errors }, { status: 422 });
  updateProfile(viewer.id, input, now());
  return json({ ok: true });
});
