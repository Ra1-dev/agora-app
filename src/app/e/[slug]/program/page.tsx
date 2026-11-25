import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProgrammeList, ProgrammeRow } from "@/components/ProgrammeRow";
import { TrackDot } from "@/components/TrackDot";
import { UrlSearch } from "@/components/UrlSearch";
import { requireMember } from "@/lib/auth/current-user";
import { now } from "@/lib/clock";
import { dayKey, eventDays, formatDayKey } from "@/lib/time";
import { getEventBySlug } from "@/server/events";
import { loadProgram, searchProgram, type ProgramSession } from "@/server/program";
import { toRow, viewerContext } from "@/server/rows";
import styles from "./program.module.css";

export const metadata: Metadata = { title: "Program" };

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ day?: string; track?: string; q?: string; sort?: string }>;
};

const PICKS_SHOWN = 3;

/** Program (FR-10, FR-11, FR-14): day tabs, search, track filter, sort, "Picked for you" at the top. */
export default async function ProgramPage({ params, searchParams }: Props) {
  const event = getEventBySlug((await params).slug);
  if (!event) notFound();
  const { viewer } = await requireMember(event.id);
  const sp = await searchParams;
  const current = now();
  const program = loadProgram(event);
  const ctx = viewerContext(event, program, viewer.id, current);

  const days = eventDays(event.startsOn, event.endsOn);
  const today = dayKey(current, event.timeZone);
  const day = sp.day && days.includes(sp.day) ? sp.day : days.includes(today) ? today : days[0]!;
  const track = program.tracks.find((t) => t.id === sp.track) ?? null;
  const q = (sp.q ?? "").trim();
  const sort = q && sp.sort === "time" ? "time" : q ? "relevance" : "time";

  const href = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams();
    const merged = { day: sp.day ?? null, track: sp.track ?? null, q: sp.q ?? null, sort: sp.sort ?? null, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v);
    return `/e/${event.slug}/program${next.size ? `?${next}` : ""}`;
  };
  const byTrack = (s: ProgramSession) => !track || s.track.id === track.id;
  const row = (s: ProgramSession, extra: { showDay?: boolean; note?: string; showPick?: boolean } = {}) => (
    <ProgrammeRow
      key={s.id}
      row={toRow(s, ctx, { showPick: extra.showPick ?? true })}
      slug={event.slug}
      timeZone={event.timeZone}
      ink={program.inks.get(s.track.id)}
      showDay={extra.showDay}
      note={extra.note}
    />
  );

  // ---------- search results ----------
  let results: ProgramSession[] = [];
  if (q) {
    const hits = searchProgram(event, program, q);
    results = hits.map((h) => program.byId.get(String(h.sessionId))!).filter((s) => s && byTrack(s));
    if (sort === "time") results = [...results].sort((a, b) => a.startsAt - b.startsAt);
  }

  // ---------- picks ----------
  const picks = ctx.picks;
  const shownPicks = picks.picks
    .map((p) => ({ pick: p, session: program.byId.get(String(p.sessionId)) }))
    .filter((p): p is { pick: (typeof picks.picks)[number]; session: ProgramSession } => Boolean(p.session) && byTrack(p.session!))
    .slice(0, PICKS_SHOWN);

  const daySessions = program.sessions.filter((s) => dayKey(s.startsAt, event.timeZone) === day && byTrack(s));

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Program</h1>

      <UrlSearch id="program-search" label="Search sessions, speakers, topics" placeholder="Search sessions, speakers, topics" />

      <nav className={styles.chips} aria-label="Filter by track">
        <Link href={href({ track: null })} className={styles.chip} aria-current={!track ? "true" : undefined} scroll={false}>
          All tracks
        </Link>
        {program.tracks.map((t) => (
          <Link
            key={t.id}
            href={href({ track: t.id })}
            className={styles.chip}
            aria-current={track?.id === t.id ? "true" : undefined}
            scroll={false}
          >
            <TrackDot ink={program.inks.get(t.id)} />
            {t.name}
          </Link>
        ))}
      </nav>

      {q ? (
        <section className={styles.section} aria-labelledby="results-title">
          <div className={styles.sectionHead}>
            <h2 id="results-title" className={styles.resultsTitle}>
              {results.length ? `${results.length} ${results.length === 1 ? "session" : "sessions"} for “${q}”` : `No sessions for “${q}”`}
            </h2>
            {results.length > 1 ? (
              <div className={styles.sort} role="group" aria-label="Sort">
                <span className={styles.sortLabel}>Sort by</span>
                <Link href={href({ sort: null })} aria-current={sort === "relevance" ? "true" : undefined} className={styles.sortOption} scroll={false}>
                  Relevance
                </Link>
                <Link href={href({ sort: "time" })} aria-current={sort === "time" ? "true" : undefined} className={styles.sortOption} scroll={false}>
                  Time
                </Link>
              </div>
            ) : null}
          </div>
          {results.length ? (
            <ProgrammeList label="Search results">{results.map((s) => row(s, { showDay: true }))}</ProgrammeList>
          ) : (
            <p className={styles.muted}>
              Try another word, a speaker&apos;s name or a topic{track ? `, or show all tracks` : ""}.
            </p>
          )}
        </section>
      ) : (
        <>
          <section className={styles.section} aria-labelledby="picks-title">
            <h2 id="picks-title">Picked for you</h2>
            {picks.mode === "empty" ? (
              <div className={styles.empty}>
                <p className={styles.emptyTitle}>{picks.title}</p>
                <p className={styles.muted}>{picks.message}</p>
              </div>
            ) : (
              <>
                {picks.mode === "popular" ? (
                  <p className={styles.muted}>
                    {picks.label}{" "}
                    <Link href={`/e/${event.slug}/profile`} className={styles.inlineLink}>
                      Add interests
                    </Link>
                  </p>
                ) : null}
                {shownPicks.length ? (
                  <ProgrammeList label="Picked for you">
                    {shownPicks.map(({ pick, session }) =>
                      row(session, picks.mode === "popular" ? { showDay: true, note: pick.reason, showPick: false } : { showDay: true }),
                    )}
                  </ProgrammeList>
                ) : (
                  <p className={styles.muted}>No picks in {track?.name ?? "this"} track. Try all tracks.</p>
                )}
              </>
            )}
          </section>

          <section className={styles.section} aria-labelledby="day-title">
            <h2 id="day-title" className="ag-sr-only">
              {formatDayKey(day)}
            </h2>
            <nav className={styles.days} aria-label="Day">
              {days.map((d) => (
                <Link key={d} href={href({ day: d })} className={styles.day} aria-current={d === day ? "true" : undefined} scroll={false}>
                  {formatDayKey(d)}
                </Link>
              ))}
            </nav>
            {daySessions.length ? (
              <ProgrammeList label={`Sessions on ${formatDayKey(day)}`}>{daySessions.map((s) => row(s))}</ProgrammeList>
            ) : (
              <p className={styles.muted}>No {track?.name} sessions on {formatDayKey(day)}.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
