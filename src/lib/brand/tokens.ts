// Typed access to the approved W3C tokens, for logic that needs raw values (colour maths).
// Styling never reads these: it uses the --ag-* CSS variables from agora.css.
import tokens from "../../../design/tokens/agora.tokens.json";

export const TRACK_INKS = ["blue", "green", "yellow", "teal", "pink", "orange", "burgundy", "purple"] as const;
export type TrackInk = (typeof TRACK_INKS)[number];

type ColorGroup = Record<string, { $value: string }>;
const light = tokens.color.light as ColorGroup;

function lightValue(name: string): string {
  const entry = light[name];
  if (!entry) throw new Error(`Missing colour token: color.light.${name}`);
  return entry.$value;
}

/** Track ink order from the tokens file (sheet 14). */
export const TRACK_ORDER: readonly TrackInk[] = (tokens.track.order.$value as string[]).map((ink) => {
  if (!(TRACK_INKS as readonly string[]).includes(ink)) throw new Error(`Unknown track ink: ${ink}`);
  return ink as TrackInk;
});

export const TRACK_CLASH_DELTA_E: number = tokens.track["clash-delta-e"].$value;

/** Inks that get a 1px edge on light surfaces. */
export const EDGE_INKS_LIGHT: readonly TrackInk[] = tokens.track["edge-inks-light"].$value as TrackInk[];

/** Light-theme ("Paros") ink colours, used for the clash check against the accent. */
export function trackInkHex(ink: TrackInk): string {
  return lightValue(`track-${ink}`);
}

/** AGORA's default action colour (light theme). */
export const DEFAULT_ACCENT_LIGHT: string = lightValue("accent");
