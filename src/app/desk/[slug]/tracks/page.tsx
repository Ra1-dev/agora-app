import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrackDot } from "@/components/TrackDot";
import { requireOrganizer } from "@/lib/auth/current-user";
import { plural } from "@/lib/text";
import { getEventBySlug } from "@/server/events";
import { loadProgram } from "@/server/program";
import styles from "../announcements/announcements.module.css";

export const metadata: Metadata = { title: "Tracks & rooms" };

/** Tracks and rooms, read-only in the demo. Track inks follow S14 against the event colour. */
export default async function TracksPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event) notFound();
  await requireOrganizer(event.id);
  const program = loadProgram(event);
  const count = (pred: (s: (typeof program.sessions)[number]) => boolean) => program.sessions.filter(pred).length;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Tracks &amp; rooms</h1>
      <p className={styles.hint}>Read-only in this demo. Track colours are assigned by AGORA from the event colour; the track name always appears next to its colour.</p>
      <section className={styles.section} aria-labelledby="tracks">
        <h2 id="tracks">Tracks</h2>
        <ol className={styles.list}>
          {program.tracks.map((t) => (
            <li key={t.id} className={styles.item}>
              <p className={styles.body} style={{ display: "flex", alignItems: "center", gap: "var(--ag-space-2)" }}>
                <TrackDot ink={program.inks.get(t.id)} size={12} /> {t.name}
              </p>
              <p className={styles.meta}>
                {t.description} {plural(count((s) => s.track.id === t.id), "session")}. Ink: {program.inks.get(t.id)?.ink ?? "none"}.
              </p>
            </li>
          ))}
        </ol>
      </section>
      <section className={styles.section} aria-labelledby="rooms">
        <h2 id="rooms">Rooms</h2>
        <ol className={styles.list}>
          {program.venues.map((v) => (
            <li key={v.id} className={styles.item}>
              <p className={styles.body}>{v.name}</p>
              <p className={styles.meta}>
                {v.floor}. {plural(count((s) => s.venue.id === v.id && !s.canceled), "session")} scheduled.
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
