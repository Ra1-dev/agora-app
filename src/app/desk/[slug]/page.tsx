import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ViewingAs } from "@/components/ViewingAs";
import { AccessError, requireOrganizer } from "@/lib/auth/current-user";
import { getEventBySlug } from "@/server/events";
import styles from "../../placeholder.module.css";

export const metadata: Metadata = { title: "Organizer desk" };
export const dynamic = "force-dynamic";

// Placeholder until build step 9 (Overview, Sessions, Announcements, Tracks and rooms).
export default async function DeskPlaceholder({ params }: { params: Promise<{ slug: string }> }) {
  const event = getEventBySlug((await params).slug);
  if (!event) notFound();
  let message: string | null = null;
  try {
    const organizer = await requireOrganizer(event.id);
    message = `Viewing as ${organizer.name}, organizer. The organizer desk arrives in build step 9.`;
  } catch (error) {
    if (!(error instanceof AccessError)) throw error;
    message = error.message;
  }
  return (
    <>
      <header className={styles.header}>
        {/* On the desk AGORA is the host: plain logo on the left (S12 §12.9). */}
        <span className={styles.logo}>
          <img className="ag-only-light" src="/brand/agora-logo-ink.svg" alt="AGΩRA" />
          <img className="ag-only-dark" src="/brand/agora-logo-white.svg" alt="AGΩRA" />
        </span>
        <ViewingAs surface="desk" eventSlug={event.slug} />
      </header>
      <main className={styles.main}>
        <h1 className={styles.title}>{event.name}</h1>
        <p className={styles.muted}>{message}</p>
      </main>
    </>
  );
}
