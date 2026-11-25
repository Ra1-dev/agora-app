"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./overview.module.css";

type Option = { value: string; label: string };

type Props = {
  days: Option[];
  tracks: Option[];
  sessions: (Option & { trackId: string; day: string })[];
};

/** Filters for the Overview (FR-22, UC-06): day, time range, track, session — all in one row. */
export function StatsFilters({ days, tracks, sessions }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const get = (k: string) => params.get(k) ?? "";
  const day = get("day");
  const track = get("track");

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    next.delete("fresh");
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    // Time range only makes sense within a day; a session only within its track.
    if (!next.get("day")) {
      next.delete("from");
      next.delete("to");
    }
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  };

  const sessionOptions = sessions.filter((s) => (!track || s.trackId === track) && (!day || s.day === day));

  return (
    <form className={styles.filters} aria-label="Filter stats" onSubmit={(e) => e.preventDefault()}>
      <label className={styles.filter}>
        <span className={styles.filterLabel}>Day</span>
        <select value={day} onChange={(e) => update({ day: e.target.value })} className={styles.select}>
          <option value="">All days</option>
          {days.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.filter}>
        <span className={styles.filterLabel}>From</span>
        <input type="time" value={get("from")} disabled={!day} step={900} onChange={(e) => update({ from: e.target.value })} className={styles.select} />
      </label>
      <label className={styles.filter}>
        <span className={styles.filterLabel}>To</span>
        <input type="time" value={get("to")} disabled={!day} step={900} onChange={(e) => update({ to: e.target.value })} className={styles.select} />
      </label>
      <label className={styles.filter}>
        <span className={styles.filterLabel}>Track</span>
        <select value={track} onChange={(e) => update({ track: e.target.value, session: "" })} className={styles.select}>
          <option value="">All tracks</option>
          {tracks.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className={`${styles.filter} ${styles.wide}`}>
        <span className={styles.filterLabel}>Session</span>
        <select value={get("session")} onChange={(e) => update({ session: e.target.value })} className={styles.select}>
          <option value="">All sessions</option>
          {sessionOptions.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
