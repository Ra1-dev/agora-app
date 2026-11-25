import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrackDot } from "@/components/TrackDot";
import { requireMember } from "@/lib/auth/current-user";
import { formatDateRange } from "@/lib/time";
import { getEventBySlug } from "@/server/events";
import { loadTracks, loadVenues, trackInks } from "@/server/program";
import styles from "./about.module.css";

export const metadata: Metadata = { title: "About" };

/** About the event: the organizer's copy, tracks and rooms, and "Powered by AGΩRA" (design-decisions §1). */
export default async function AboutPage({ params }: { params: Promise<{ slug: string }> }) {
  const event = getEventBySlug((await params).slug);
  if (!event) notFound();
  await requireMember(event.id);
  const tracks = loadTracks(event.id);
  const inks = trackInks(event, tracks);
  const venues = loadVenues(event.id);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{event.name}</h1>
      <p className={styles.meta}>
        {formatDateRange(event.startsOn, event.endsOn)} · {event.venueName}, {event.city}
      </p>
      <p>{event.about}</p>

      <section className={styles.section}>
        <h2>Tracks</h2>
        <ul className={styles.list}>
          {tracks.map((t) => (
            <li key={t.id}>
              <span className={styles.name}>
                <TrackDot ink={inks.get(t.id)} /> {t.name}
              </span>
              <span className={styles.muted}>{t.description}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2>Rooms</h2>
        <ul className={styles.list}>
          {venues.map((v) => (
            <li key={v.id}>
              <span className={styles.name}>{v.name}</span>
              <span className={styles.muted}>{v.floor}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className={styles.organizer}>Organized by {event.organizerName}.</p>
      <p className={styles.powered}>
        Powered by
        <img className="ag-only-light" src="/brand/agora-logo-small-ink.svg" alt="AGΩRA" />
        <img className="ag-only-dark" src="/brand/agora-logo-small-white.svg" alt="AGΩRA" />
      </p>
    </div>
  );
}
