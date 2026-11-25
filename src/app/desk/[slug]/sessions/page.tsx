import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusChip } from "@/components/StatusChip";
import { TrackDot } from "@/components/TrackDot";
import { requireOrganizer } from "@/lib/auth/current-user";
import { now } from "@/lib/clock";
import { plural } from "@/lib/text";
import { dayKey, eventDays, formatDayKey, formatTime, formatTimeRange } from "@/lib/time";
import { getEventBySlug } from "@/server/events";
import { changeReach } from "@/server/organizer";
import { loadProgram } from "@/server/program";
import { SessionEditor } from "./SessionEditor";
import styles from "./sessions.module.css";

export const metadata: Metadata = { title: "Sessions" };

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ day?: string }> };

const CHANGE_LABEL: Record<string, string> = { room_change: "Room change", rescheduled: "Rescheduled", canceled: "Cancellation" };

/** Sessions (UC-05, FR-06): edit time and room, cancel; see who the change reached. */
export default async function SessionsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event) notFound();
  await requireOrganizer(event.id);
  const current = now();
  const program = loadProgram(event);
  const days = eventDays(event.startsOn, event.endsOn);
  const requested = (await searchParams).day;
  const today = dayKey(current, event.timeZone);
  const day = requested && days.includes(requested) ? requested : days.includes(today) ? today : days[0]!;
  const list = program.sessions.filter((s) => dayKey(s.startsAt, event.timeZone) === day);
  const reach = changeReach(list.map((s) => s.id));
  const dayOptions = days.map((d) => ({ value: d, label: formatDayKey(d) }));
  const venueOptions = program.venues.map((v) => ({ value: v.id, label: `${v.name}, ${v.floor.toLowerCase()}` }));

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Sessions</h1>
      <p className={styles.muted}>
        Changing a time or room, or canceling, notifies everyone who saved the session. Their program and schedule update right away.
      </p>

      <nav className={styles.days} aria-label="Day">
        {days.map((d) => (
          <Link key={d} href={`/desk/${slug}/sessions?day=${d}`} className={styles.day} aria-current={d === day ? "true" : undefined} scroll={false}>
            {formatDayKey(d)}
          </Link>
        ))}
      </nav>

      <ol className={styles.list}>
        {list.map((s) => {
          const r = reach.get(s.id);
          const ink = program.inks.get(s.track.id);
          return (
            <li key={s.id} className={styles.row} data-session-id={s.id}>
              <div className={styles.time}>
                <span>{formatTime(s.startsAt, event.timeZone)}</span>
                <small>{formatTime(s.endsAt, event.timeZone)}</small>
              </div>
              <div className={styles.body}>
                <span className={`${styles.label} ag-label-caps`}>
                  <TrackDot ink={ink} />
                  <span>
                    {s.track.name}, <span data-room>{s.venue.name}</span>
                  </span>
                </span>
                <p className={`${styles.sessionTitle} ${s.canceled ? styles.struck : ""}`}>{s.title}</p>
                <div className={styles.meta}>
                  {s.canceled ? <StatusChip status="canceled" /> : null}
                  {!s.canceled && s.changeKind === "rescheduled" ? <StatusChip status="rescheduled" /> : null}
                  {!s.canceled && s.changeKind === "room_change" ? <StatusChip status="room-change" /> : null}
                  <span>{plural(s.saves, "save")}</span>
                </div>
                {r ? (
                  <p className={styles.reach}>
                    {CHANGE_LABEL[r.kind]} reached {r.reached} of {plural(r.total, "person", "people")} who saved this session.
                    <span className={styles.reachBar} aria-hidden="true">
                      <span style={{ width: `${r.total ? (r.reached / r.total) * 100 : 0}%` }} />
                    </span>
                  </p>
                ) : null}
              </div>
              <div className={styles.actions}>
                {s.canceled ? null : (
                  <SessionEditor
                    slug={slug}
                    days={dayOptions}
                    venues={venueOptions}
                    session={{
                      id: s.id,
                      title: s.title,
                      date: dayKey(s.startsAt, event.timeZone),
                      start: formatTime(s.startsAt, event.timeZone),
                      end: formatTime(s.endsAt, event.timeZone),
                      venueId: s.venue.id,
                      saves: s.saves,
                    }}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <p className={styles.muted}>{formatDayKey(day)}: {plural(list.length, "session")}, {formatTimeRange(list[0]?.startsAt ?? 0, list.at(-1)?.endsAt ?? 0, event.timeZone)}.</p>
    </div>
  );
}
