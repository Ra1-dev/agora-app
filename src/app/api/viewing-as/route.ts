import { allowedViewerIds, VIEWER_COOKIES, type Surface } from "@/lib/auth/current-user";
import { COOKIE_MAX_AGE, handle, json, problem, readJson } from "@/server/http";

/** Switches who the demo acts as on one surface (participant screens or the organizer desk). */
export const POST = handle(async (request: Request) => {
  const body = await readJson(request);
  const surface = body.surface === "desk" ? "desk" : body.surface === "participant" ? "participant" : null;
  const userId = typeof body.userId === "string" ? body.userId : "";
  if (!surface) return problem(400, "Pick participant screens or the organizer desk.");
  if (!allowedViewerIds(surface as Surface).includes(userId)) return problem(400, "Pick someone from the list.");

  const response = json({ ok: true, surface, userId });
  response.cookies.set(VIEWER_COOKIES[surface as Surface], userId, {
    path: "/",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
  });
  return response;
});
