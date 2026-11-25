import type { CSSProperties } from "react";
import type { TrackInkAssignment } from "@/lib/brand/track-inks";
import { EDGE_INKS_LIGHT } from "@/lib/brand/tokens";
import styles from "./TrackDot.module.css";

/**
 * Track colour dot (S14). Decorative: the track name is always shown next to it,
 * and track colour is never used for text.
 */
export function TrackDot({ ink, size = 9 }: { ink: TrackInkAssignment | undefined; size?: number }) {
  const colour = ink?.ink ? `var(--ag-color-track-${ink.ink})` : "var(--ag-color-muted)";
  const classes = [
    styles.dot,
    ink?.secondRun ? styles.ring : "",
    ink?.ink && EDGE_INKS_LIGHT.includes(ink.ink) ? styles.edge : "",
  ].join(" ");
  return <i className={classes} style={{ "--dot": colour, "--size": `${size}px` } as CSSProperties} aria-hidden="true" />;
}
