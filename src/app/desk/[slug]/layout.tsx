import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { ToastProvider } from "@/components/Toast";
import { ViewingAs } from "@/components/ViewingAs";
import { AccessError, requireOrganizer } from "@/lib/auth/current-user";
import { formatDateSpan } from "@/lib/time";
import { getEventBySlug } from "@/server/events";
import { DeskNav } from "./DeskNav";
import styles from "./desk.module.css";

export const dynamic = "force-dynamic";

type Props = { children: ReactNode; params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = getEventBySlug((await params).slug);
  return { title: { template: `%s · Organizer desk`, default: event ? `${event.name} · Organizer desk` : "Organizer desk" } };
}

/**
 * Organizer desk (desktop-first, must not break on a phone). AGORA is the host here:
 * plain AGORA logo on the left, the event on the right (S12 §12.9).
 */
export default async function DeskLayout({ children, params }: Props) {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event) notFound();

  let denied: string | null = null;
  try {
    await requireOrganizer(event.id);
  } catch (error) {
    if (!(error instanceof AccessError)) throw error;
    denied = error.message;
  }

  return (
    <ToastProvider>
      <header className={styles.header}>
        <Link href={`/desk/${slug}`} className={styles.logo} aria-label="AGΩRA organizer desk">
          <img className="ag-only-light" src="/brand/agora-logo-ink.svg" alt="" />
          <img className="ag-only-dark" src="/brand/agora-logo-white.svg" alt="" />
        </Link>
        {denied ? null : <DeskNav slug={slug} />}
        <div className={styles.right}>
          <span className={styles.event}>
            <span className={styles.eventName}>{event.name}</span>
            <span className={styles.eventMeta}>
              {formatDateSpan(event.startsOn, event.endsOn)}, {event.city}
            </span>
          </span>
          <ViewingAs surface="desk" eventSlug={slug} />
        </div>
      </header>
      <main className={styles.main}>
        {denied ? (
          <div className={styles.denied}>
            <Icon name="private" size={24} />
            <h1 className={styles.title}>Organizer desk</h1>
            <p>{denied}</p>
            <ButtonLink href={`/e/${slug}`} variant="secondary">
              Open participant screens
            </ButtonLink>
          </div>
        ) : (
          children
        )}
      </main>
    </ToastProvider>
  );
}
