import { cookies } from "next/headers";

export const THEME_COOKIE = "agora_theme";
export type ThemeChoice = "light" | "dark" | "system";

/** Reads the viewer's theme choice; "system" follows prefers-color-scheme via agora.css. */
export async function getThemeChoice(): Promise<ThemeChoice> {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  return value === "light" || value === "dark" ? value : "system";
}
