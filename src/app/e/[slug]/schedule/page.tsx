import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink, buttonClass } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { ProgrammeList, ProgrammeRow } from "@/components/ProgrammeRow";
import { requireMember } from "@/lib/auth/current-user";
import { now } from "@/lib/clock";
import { findOverlaps } from "@/lib/schedule/overlaps";
import { plural } from "@/lib/text";
import { dayKey, eventDays, formatDayKey, formatTimeRange } from "@/lib/time";
import { getEventBySlug } from "@/server/events";
import { loadProgram, sessionsByIds, type ProgramSession } from "@/server/program";
import { toRow, viewerContext } from "@/server/rows";
import { ResolveSheet, type ResolveOption } from "./ResolveSheet";
import styles from "./schedule.module.css";

export const metadata: Metadata = { title: "My schedule" };

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ resolve?: string }> };

/** My schedule (FR-12, FR-13): saved sessions in time order per day, overlaps marked, Resolve. */
export default async function SchedulePage({ params, searchParams }: Props) {
  const event = getEventBySlug((await params).slug);
  if (!event) notFound();
  const { viewer } = await requireMember(event.id);
  const { resolve } = await searchParams;
  const current = now();
  const program = loadProgram(event);
  const ctx = viewerContext(event, program, viewer.id, current);
  const saved = sessionsByIds(program, ctx.savedIds);

  if (saved.length === 0) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>My schedule</h1>
        <div className={styles.empty}>
          <Icon name="schedule" size={24} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>Your schedule is empty</p>
          <p className={styles.muted}>Save sessions from the program and they&apos;ll show up here, in time order.</p>
          <ButtonLink href={`/e/${event.slug}/program`} variant="primary" size="lg">
            Browse the program
          </ButtonLink>
        </div>
      </div>
    );
  }

  const pairs = findOverlaps(saved.map((s) => ({ ...s, id: s.id })));
  const option = (s: ProgramSession): ResolveOption => ({
    id: s.id,
    title: s.title,
    detail: `${formatTimeRange(s.startsAt, s.endsAt, event.timeZone)}, ${s.venue.name}`,
  });
  const pair = resolve ? pairs.find((p) => p.a.id === resolve || p.b.id === resolve) : undefined;
  const days = eventDays(event.startsOn, event.endsOn)
    .map((day) => ({ day, sessions: saved.filter((s) => dayKey(s.startsAt, event.timeZone) === day) }))
    .filter((d) => d.sessions.length > 0);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>My schedule</h1>
      <p className={styles.muted}>
        {plural(saved.length, "session")} saved. Saving doesn&apos;t reserve a seat; you&apos;ll get updates if anything changes.
      </p>

      {pairs.length ? (
        <div className={styles.callout} role="status">
          <Icon name="overlap" className={styles.calloutIcon} />
          <p>
            <strong>{pairs.length === 1 ? "1 overlap to resolve." : `${pairs.length} overlaps to resolve.`}</strong>{" "}
            {pairs.length === 1
              ? `${pairs[0]!.a.title} and ${pairs[0]!.b.title} run at the same time.`
              : "Pick one session in each pair so you know where to be."}
          </p>
          <Link href={`/e/${event.slug}/schedule?resolve=${pairs[0]!.a.id}`} className={buttonClass({ variant: "secondary", size: "sm" })} scroll={false}>
            Resolve
          </Link>
        </div>
      ) : null}

      {days.map(({ day, sessions }) => (
        <section key={day} className={styles.day} aria-labelledby={`day-${day}`}>
          <h2 id={`day-${day}`} className={styles.dayTitle}>
            {formatDayKey(day)}
            <span className={styles.count}>{plural(sessions.length, "session")}</span>
          </h2>
          <ProgrammeList label={`My schedule, ${formatDayKey(day)}`}>
            {sessions.map((s) => (
              <ProgrammeRow key={s.id} row={toRow(s, ctx)} slug={event.slug} timeZone={event.timeZone} ink={program.inks.get(s.track.id)} />
            ))}
          </ProgrammeList>
        </section>
      ))}

      {pair ? (
        <ResolveSheet
          key={`${pair.a.id}-${pair.b.id}`}
          slug={event.slug}
          minutes={pair.minutes}
          options={[option(pair.a), option(pair.b)]}
        />
      ) : null}
    </div>
  );
}
