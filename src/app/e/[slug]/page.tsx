import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewingAs } from "@/components/ViewingAs";
import { AccessError, requireMember } from "@/lib/auth/current-user";
import { getEventBySlug } from "@/server/events";
import styles from "../../placeholder.module.css";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const event = getEventBySlug((await params).slug);
  return { title: event ? { absolute: event.name } : "Event" };
}

// Placeholder until build step 5 (event layout, Event home, Program, Session).
export default async function EventHomePlaceholder({ params }: Params) {
  const event = getEventBySlug((await params).slug);
  if (!event) notFound();
  let message: string | null = null;
  try {
    await requireMember(event.id);
  } catch (error) {
    if (!(error instanceof AccessError)) throw error;
    message = error.message;
  }
  return (
    <>
      <header className={styles.header}>
        <span className={styles.logo}>
          <img className="ag-only-light" src={event.logoUrl} alt={event.organizerName} />
          <img className="ag-only-dark" src={event.logoDarkUrl ?? event.logoUrl} alt={event.organizerName} />
        </span>
        <ViewingAs surface="participant" eventSlug={event.slug} />
      </header>
      <main className={styles.main}>
        <h1 className={styles.title}>{event.name}</h1>
        <p className={styles.muted}>{message ?? "Event home, Program and Session arrive in build step 5."}</p>
        <Link href="/" className={styles.link}>
          Back to My events
        </Link>
      </main>
    </>
  );
}
