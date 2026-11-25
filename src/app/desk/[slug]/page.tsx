import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { buttonClass } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { StatusChip } from "@/components/StatusChip";
import { TrackDot } from "@/components/TrackDot";
import { requireOrganizer } from "@/lib/auth/current-user";
import { now } from "@/lib/clock";
import { dayKey, eventDays, formatDayKey, formatTime, formatUpdated, zonedParts } from "@/lib/time";
import { getEventBySlug } from "@/server/events";
import { eventStats } from "@/server/organizer";
import { loadProgram } from "@/server/program";
import { StatsFilters } from "./StatsFilters";
import styles from "./overview.module.css";

export const metadata: Metadata = { title: "Overview" };

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ day?: string; track?: string; session?: string; from?: string; to?: string; fresh?: string }>;
};

const fmt = new Intl.NumberFormat("en-US");
const TIME = /^\d{2}:\d{2}$/;

/** Overview (UC-06): aggregates only, with filters and how fresh they are. */
export default async function OverviewPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event) notFound();
  await requireOrganizer(event.id);
  const sp = await searchParams;
  const current = now();
  const program = loadProgram(event);
  const days = eventDays(event.startsOn, event.endsOn);

  const filter = {
    day: sp.day && days.includes(sp.day) ? sp.day : undefined,
    trackId: program.tracks.some((t) => t.id === sp.track) ? sp.track : undefined,
    sessionId: program.byId.has(sp.session ?? "") ? sp.session : undefined,
    from: sp.from && TIME.test(sp.from) ? sp.from : undefined,
    to: sp.to && TIME.test(sp.to) ? sp.to : undefined,
  };
  if (!filter.day) {
    filter.from = undefined;
    filter.to = undefined;
  }
  const stats = eventStats(event, filter, current, sp.fresh === "1");
  const maxSaves = Math.max(1, ...stats.sessions.map((s) => s.saves));
  const refreshHref = `/desk/${slug}?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([k, v]) => v && k !== "fresh")), fresh: "1" })}`;

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Overview</h1>
        <p className={styles.updated}>
          <Icon name="time" size={16} />
          {formatUpdated(stats.computedAt, current)}
          <Link href={refreshHref} className={buttonClass({ variant: "text", size: "sm" })} scroll={false}>
            <Icon name="refresh" size={16} />
            Refresh
          </Link>
        </p>
      </div>

      <StatsFilters
        days={days.map((d) => ({ value: d, label: formatDayKey(d) }))}
        tracks={program.tracks.map((t) => ({ value: t.id, label: t.name }))}
        sessions={program.sessions.map((s) => ({
          value: s.id,
          label: `${zonedParts(s.startsAt, event.timeZone).weekday} ${formatTime(s.startsAt, event.timeZone)} · ${s.title}`,
          trackId: s.track.id,
          day: dayKey(s.startsAt, event.timeZone),
        }))}
      />

      {stats.empty ? (
        <p className={styles.notice} role="status">
          <Icon name="info" size={18} />
          {filter.from || filter.to
            ? `No activity between ${filter.from ?? "00:00"} and ${filter.to ?? "24:00"}. Try a wider range.`
            : `No activity on ${formatDayKey(filter.day!)}. Try a wider range.`}
        </p>
      ) : null}

      <ul className={styles.tiles} aria-label="Totals">
        {stats.tiles.map((t) => (
          <li key={t.key} className={styles.tile}>
            <span className={`${styles.tileLabel} ag-label-caps`}>{t.label}</span>
            <span className={styles.figure}>{fmt.format(t.value)}</span>
            <span className={styles.today}>{t.today ? `+${fmt.format(t.today)} today` : "None today yet"}</span>
          </li>
        ))}
      </ul>
      {filter.trackId || filter.sessionId ? (
        <p className={styles.muted}>Registrations and connections are for the whole event; the other totals follow the filters.</p>
      ) : null}

      <section className={styles.section} aria-labelledby="sessions-table">
        <h2 id="sessions-table">Sessions</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Session</th>
                <th scope="col">Track</th>
                <th scope="col" className={styles.num}>
                  Views
                </th>
                <th scope="col" className={styles.num}>
                  Saves
                </th>
                <th scope="col" className={styles.num}>
                  Check-ins
                </th>
                <th scope="col" className={styles.barCol}>
                  <span className="ag-sr-only">Saves, relative</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.sessions.map((s) => {
                const track = program.tracks.find((t) => t.id === s.trackId);
                const ink = program.inks.get(s.trackId);
                return (
                  <tr key={s.id}>
                    <th scope="row" className={styles.sessionCell}>
                      <span className={styles.sessionTitle}>{s.title}</span>
                      <span className={styles.sessionMeta}>
                        {zonedParts(s.startsAt, event.timeZone).weekday} {formatTime(s.startsAt, event.timeZone)}
                        {s.canceled ? <StatusChip status="canceled" /> : null}
                      </span>
                    </th>
                    <td>
                      <span className={styles.track}>
                        <TrackDot ink={ink} />
                        {track?.name}
                      </span>
                    </td>
                    <td className={styles.num}>{fmt.format(s.views)}</td>
                    <td className={styles.num}>{fmt.format(s.saves)}</td>
                    <td className={styles.num}>{fmt.format(s.checkIns)}</td>
                    <td className={styles.barCol} aria-hidden="true">
                      <span
                        className={styles.bar}
                        style={{ "--w": `${(s.saves / maxSaves) * 100}%`, "--ink": ink?.ink ? `var(--ag-color-track-${ink.ink})` : "var(--ag-color-muted)" } as CSSProperties}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className={styles.muted}>Totals only. Private messages are never part of these numbers.</p>
      </section>
    </div>
  );
}
