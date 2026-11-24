// Track colours (design-decisions §2, sheet S14).
import { deltaE76 } from "./color";
import { TRACK_CLASH_DELTA_E, TRACK_ORDER, trackInkHex, type TrackInk } from "./tokens";

export type TrackRef = { id: string | number; position: number };

export type TrackInkAssignment = {
  /** null for tracks beyond 16: the organizer colours by stream instead (out of scope for the demo). */
  ink: TrackInk | null;
  /** Tracks 9–16: ring dot and dashed stripe. */
  secondRun: boolean;
};

export const MAX_COLOURED_TRACKS = TRACK_ORDER.length * 2;

/** The ink queue for an event: inks within ΔE76 < 30 of the accent move to the end, order kept. */
export function inkQueue(accentHex: string): TrackInk[] {
  const clashes = (ink: TrackInk) => deltaE76(trackInkHex(ink), accentHex) < TRACK_CLASH_DELTA_E;
  return [...TRACK_ORDER.filter((ink) => !clashes(ink)), ...TRACK_ORDER.filter(clashes)];
}

/**
 * Assigns inks to tracks in their display order (position, then id).
 * `accentHex` is the event's light-theme action colour.
 */
export function assignTrackInks<T extends TrackRef>(
  tracks: readonly T[],
  accentHex: string,
): Map<T["id"], TrackInkAssignment> {
  const queue = inkQueue(accentHex);
  const ordered = [...tracks].sort((a, b) => a.position - b.position || String(a.id).localeCompare(String(b.id)));
  const result = new Map<T["id"], TrackInkAssignment>();
  ordered.forEach((track, index) => {
    if (index >= MAX_COLOURED_TRACKS) {
      result.set(track.id, { ink: null, secondRun: false });
      return;
    }
    result.set(track.id, { ink: queue[index % queue.length] ?? null, secondRun: index >= queue.length });
  });
  return result;
}
