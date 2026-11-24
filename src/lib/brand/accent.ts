// Action colour from the organizer colour (design-decisions §1, sheet S07).
import { contrastRatio, hsvSaturation, mix, parseHex, toHex } from "./color";

export const LIGHT_SURFACE = "#FFFFFF";
export const DARK_SURFACE = "#1B1A18";
export const ON_ACCENT_LIGHT = "#FFFFFF";
export const ON_ACCENT_DARK = "#111110";
export const INK_DAY = "#151618";
export const INK_NIGHT = "#F0EDE6";
export const MIN_CONTRAST = 4.5;
export const MONOCHROME_SATURATION = 0.12;

export type ThemeAccent = {
  accent: string;
  onAccent: string;
};

export type DerivedAccent = {
  light: ThemeAccent;
  dark: ThemeAccent;
  /** Monochrome organizer: accent is ink, links must be underlined. */
  monochrome: boolean;
};

const STEP = 0.005;

/** Moves `hex` toward `target` in small steps until it reaches MIN_CONTRAST against `surface`. */
function pushUntilContrast(hex: string, target: string, surface: string): string {
  for (let t = 0; t <= 1; t += STEP) {
    const candidate = mix(hex, target, Math.min(1, t));
    if (contrastRatio(candidate, surface) >= MIN_CONTRAST) return candidate;
  }
  return toHex(parseHex(target));
}

/** White or #111110, whichever contrasts more with the accent. */
export function pickOnAccent(accent: string): string {
  return contrastRatio(accent, ON_ACCENT_LIGHT) >= contrastRatio(accent, ON_ACCENT_DARK)
    ? ON_ACCENT_LIGHT
    : ON_ACCENT_DARK;
}

export function deriveAccent(organizerHex: string): DerivedAccent {
  const base = toHex(parseHex(organizerHex));

  if (hsvSaturation(base) < MONOCHROME_SATURATION) {
    return {
      light: { accent: INK_DAY, onAccent: pickOnAccent(INK_DAY) },
      dark: { accent: INK_NIGHT, onAccent: pickOnAccent(INK_NIGHT) },
      monochrome: true,
    };
  }

  const light = pushUntilContrast(base, "#000000", LIGHT_SURFACE);
  const dark = pushUntilContrast(base, "#FFFFFF", DARK_SURFACE);
  return {
    light: { accent: light, onAccent: pickOnAccent(light) },
    dark: { accent: dark, onAccent: pickOnAccent(dark) },
    monochrome: false,
  };
}

function declarations({ accent, onAccent }: ThemeAccent): string {
  return `--ag-color-accent:${accent};--ag-color-on-accent:${onAccent};`;
}

/**
 * CSS that overrides only --ag-color-accent and --ag-color-on-accent for an event,
 * mirroring the theme selectors in agora.css. Must be placed after agora.css.
 */
export function accentCss(derived: DerivedAccent): string {
  const light = declarations(derived.light);
  const dark = declarations(derived.dark);
  const links = derived.monochrome ? "a{text-decoration:underline;}" : "";
  return (
    `:root{${light}}` +
    `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${dark}}}` +
    `:root[data-theme="dark"]{${dark}}` +
    links
  );
}
