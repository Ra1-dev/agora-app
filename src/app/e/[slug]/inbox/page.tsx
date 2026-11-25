import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { requireMember } from "@/lib/auth/current-user";
import { now } from "@/lib/clock";
import { present } from "@/lib/notifications/present";
import { firstName, plural } from "@/lib/text";
import { formatAgo } from "@/lib/time";
import { getEventBySlug } from "@/server/events";
import { listNotifications } from "@/server/notify";
import { connectionsFor, getProfile } from "@/server/people";
import { PersonActions } from "../people/PersonActions";
import { InboxLink, MarkAllRead, MarkOneRead } from "./InboxControls";
import styles from "./inbox.module.css";

export const metadata: Metadata = { title: "Inbox" };

/** Inbox (FR-20, FR-21): what changed and what to do, newest first, unread marked. */
export default async function InboxPage({ params }: { params: Promise<{ slug: string }> }) {
  const event = getEventBySlug((await params).slug);
  if (!event) notFound();
  const { viewer } = await requireMember(event.id);
  const current = now();
  const items = listNotifications(event.id, viewer.id).filter((n) => n.createdAt <= current);
  const unread = items.filter((n) => !n.readAt).length;
  const pendingIncoming = new Map(
    connectionsFor(event.id, viewer.id)
      .filter((c) => c.status === "pending" && c.direction === "incoming")
      .map((c) => [c.id, c]),
  );
  const canAnswer = getProfile(viewer.id)?.networkingOptIn ?? false;

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Inbox</h1>
        {unread ? <MarkAllRead slug={event.slug} /> : null}
      </div>
      <p className={styles.muted}>{unread ? `${plural(unread, "unread update")}.` : "You're up to date."}</p>

      {items.length === 0 ? (
        <div className={styles.empty}>
          <Icon name="inbox" size={24} className={styles.muted} />
          <p className={styles.emptyTitle}>Nothing here yet</p>
          <p className={styles.muted}>Changes to sessions you saved, requests, messages and announcements show up here.</p>
        </div>
      ) : (
        <ol className={styles.list}>
          {items.map((n) => {
            const p = present(event.slug, n);
            const isUnread = !n.readAt;
            const request = n.kind === "connection_request" && n.connectionId ? pendingIncoming.get(n.connectionId) : undefined;
            const name = request ? firstName(getProfile(request.otherId)?.name ?? "") : "";
            return (
              <li key={n.id} className={`${styles.item} ${isUnread ? styles.unread : ""}`}>
                <span className={`${styles.icon} ${styles[p.tone]}`}>
                  <Icon name={p.icon} />
                </span>
                <div className={styles.text}>
                  <p className={styles.itemTitle}>
                    {isUnread ? <span className="ag-sr-only">Unread: </span> : null}
                    {n.title}
                  </p>
                  <p className={styles.body}>{n.body}</p>
                  {request && canAnswer ? (
                    <div className={styles.actions}>
                      <PersonActions slug={event.slug} state={{ kind: "incoming", connectionId: request.id, name }} />
                    </div>
                  ) : p.href && p.action ? (
                    <div className={styles.actions}>
                      <InboxLink slug={event.slug} id={n.id} href={p.href} unread={isUnread} className={styles.action}>
                        {p.action}
                        <Icon name="chevron-right" size={16} />
                      </InboxLink>
                    </div>
                  ) : isUnread ? (
                    <div className={styles.actions}>
                      <MarkOneRead slug={event.slug} id={n.id} />
                    </div>
                  ) : null}
                </div>
                <div className={styles.side}>
                  <time className={styles.time} dateTime={new Date(n.createdAt).toISOString()}>
                    {formatAgo(n.createdAt, current, event.timeZone)}
                  </time>
                  {isUnread ? <span className={styles.dot} aria-hidden="true" /> : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
