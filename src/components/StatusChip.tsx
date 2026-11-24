import { Icon } from "./Icon";
import type { IconName } from "./icon-names";
import styles from "./StatusChip.module.css";

export type Status = "live" | "rescheduled" | "room-change" | "canceled" | "checked-in" | "picked";

const LABELS: Record<Status, string> = {
  live: "Live now",
  rescheduled: "Rescheduled",
  "room-change": "Room change",
  canceled: "Canceled",
  "checked-in": "Checked in",
  picked: "Picked for you",
};

const ICONS: Partial<Record<Status, IconName>> = {
  rescheduled: "rescheduled",
  "room-change": "room",
  canceled: "canceled",
  "checked-in": "check-in",
};

/**
 * Session and event status chips (S12 §12.3). Never colour alone: "Live now" has a dot and a word,
 * changes and cancellations carry an icon and a word.
 */
export function StatusChip({ status }: { status: Status }) {
  const icon = ICONS[status];
  return (
    <span className={`${styles.chip} ${styles[status]}`}>
      {status === "live" ? <span className={styles.dot} aria-hidden="true" /> : null}
      {icon ? <Icon name={icon} size={14} /> : null}
      {LABELS[status]}
    </span>
  );
}
