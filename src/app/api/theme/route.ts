import { THEME_COOKIE } from "@/lib/theme";
import { COOKIE_MAX_AGE, handle, json, problem, readJson } from "@/server/http";

/** Stores the theme choice; "system" removes the cookie and follows the device. */
export const POST = handle(async (request: Request) => {
  const { theme } = await readJson(request);
  if (theme !== "light" && theme !== "dark" && theme !== "system") return problem(400, "Pick light, dark or system.");
  const response = json({ ok: true, theme });
  if (theme === "system") response.cookies.delete(THEME_COOKIE);
  else response.cookies.set(THEME_COOKIE, theme, { path: "/", sameSite: "lax", maxAge: COOKIE_MAX_AGE });
  return response;
});
