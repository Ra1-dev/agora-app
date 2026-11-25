import Link from "next/link";
import type { TrackInkAssignment } from "@/lib/brand/track-inks";
import { shortName } from "@/lib/text";
import { formatTime, zonedParts } from "@/lib/time";
import type { RowData } from "@/server/rows";
import { buttonClass } from "./Button";
import { SaveToggle } from "./SaveToggle";
import { StatusChip } from "./StatusChip";
import { TrackDot } from "./TrackDot";
import styles from "./ProgrammeRow.module.css";

type Props = {
  row: RowData;
  slug: string;
  timeZone: string;
  ink: TrackInkAssignment | undefined;
  /** Prefix the label with the weekday (search results, picks across days). */
  showDay?: boolean;
  /** Extra muted line, e.g. "Popular in the AI track." */
  note?: string;
  headingLevel?: 2 | 3;
};

/**
 * The programme row (design-decisions §3): the only way a session is listed.
 * Time on the left, hairline rows, no card boxes; status and reasons inside the row.
 */
export function ProgrammeRow({ row, slug, timeZone, ink, showDay, note, headingLevel = 3 }: Props) {
  const { session, state } = row;
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const href = `/e/${slug}/sessions/${session.id}`;
  const speakers = session.speakers.map((s) => shortName(s.name)).join(", ");
  const day = showDay ? `${zonedParts(session.startsAt, timeZone).weekday} · ` : "";

  return (
    <li
      className={`${styles.row} ${state.overlaps ? styles.overlap : ""} ${state.canceled ? styles.canceled : ""} ${state.ended && !state.live ? styles.ended : ""}`}
      data-session-id={session.id}
    >
      <div className={styles.time}>
        {state.oldStart ? (
          <s className={styles.old}>
            <span className="ag-sr-only">was </span>
            {state.oldStart}
          </s>
        ) : null}
        <span>{formatTime(session.startsAt, timeZone)}</span>
        <small>{formatTime(session.endsAt, timeZone)}</small>
      </div>

      <div className={styles.body}>
        <span className={`${styles.label} ag-label-caps`}>
          <TrackDot ink={ink} />
          <span>
            {day}
            {session.track.name}, <span data-room>{session.venue.name}</span>
          </span>
        </span>

        {state.chips.length ? (
          <div className={styles.chips}>
            {state.chips.map((c) => (
              <StatusChip key={c} status={c} />
            ))}
          </div>
        ) : null}

        <Heading className={styles.title}>
          <Link href={href} className={styles.link}>
            {session.title}
          </Link>
        </Heading>

        {state.messages.map((m) => (
          <p key={m.text} className={`${styles.message} ${styles[m.tone]}`}>
            {m.text}
          </p>
        ))}
        {note ? <p className={`${styles.message} ${styles.muted}`}>{note}</p> : null}

        <div className={styles.foot}>
          <span className={styles.speakers}>{speakers}</span>
          {state.overlaps ? (
            <Link href={`/e/${slug}/schedule?resolve=${session.id}`} className={buttonClass({ variant: "secondary", size: "sm" })} scroll={false}>
              Resolve
            </Link>
          ) : (
            <SaveToggle slug={slug} sessionId={session.id} title={session.title} state={state.save} />
          )}
        </div>
      </div>
    </li>
  );
}

export function ProgrammeList({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <ol className={styles.list} aria-label={label}>
      {children}
    </ol>
  );
}
