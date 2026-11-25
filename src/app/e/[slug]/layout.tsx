import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/Button";
import { ToastProvider } from "@/components/Toast";
import { ViewingAs } from "@/components/ViewingAs";
import { accentCss, deriveAccent } from "@/lib/brand/accent";
import { AccessError, requireMember } from "@/lib/auth/current-user";
import { getEventBySlug } from "@/server/events";
import { unreadCount } from "@/server/program";
import { EventTabs } from "./EventTabs";
import styles from "./event.module.css";

export const dynamic = "force-dynamic";

type Props = { children: ReactNode; params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = getEventBySlug((await params).slug);
  return event ? { title: { template: `%s · ${event.name}`, default: event.name } } : {};
}

/**
 * Event screens: the organizer's fill (logo, action colour, cover) inside AGORA's frame.
 * The header shows the organizer's logo and the event name, never AGORA (design-decisions §1).
 */
export default async function EventLayout({ children, params }: Props) {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event) notFound();

  let viewerId: string | null = null;
  let denied: string | null = null;
  try {
    viewerId = (await requireMember(event.id)).viewer.id;
  } catch (error) {
    if (!(error instanceof AccessError)) throw error;
    denied = error.message;
  }

  return (
    <div className={styles.frame}>
      {/* Event branding overrides only the accent pair (design-decisions §1). */}
      <style>{accentCss(deriveAccent(event.brandColor))}</style>
      <ToastProvider>
        <header className={styles.header}>
          <Link href={`/e/${event.slug}`} className={styles.brand}>
            <span className={styles.logo}>
              <img className="ag-only-light" src={event.logoUrl} alt={event.organizerName} />
              <img className="ag-only-dark" src={event.logoDarkUrl ?? event.logoUrl} alt={event.organizerName} />
            </span>
            <span className={styles.eventName}>{event.name}</span>
          </Link>
          <ViewingAs surface="participant" eventSlug={event.slug} />
        </header>

        {denied || !viewerId ? (
          <main className={styles.main}>
            <div className={styles.notice}>
              <h1 className={styles.noticeTitle}>{event.name}</h1>
              <p>{denied}</p>
              <ButtonLink href="/" variant="primary" size="lg">
                Go to My events
              </ButtonLink>
            </div>
          </main>
        ) : (
          <>
            <EventTabs slug={event.slug} unread={unreadCount(event.id, viewerId)} />
            <main className={styles.main}>{children}</main>
          </>
        )}
      </ToastProvider>
    </div>
  );
}
