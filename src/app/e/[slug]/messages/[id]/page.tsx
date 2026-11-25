import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { RefreshOnce } from "@/components/RefreshOnce";
import { requireMember } from "@/lib/auth/current-user";
import { now } from "@/lib/clock";
import { visibleProfile } from "@/lib/people/visibility";
import { firstName } from "@/lib/text";
import { dayKey, formatDay, formatTime } from "@/lib/time";
import { getEventBySlug } from "@/server/events";
import { getConnection, getProfile, listMessages, markConversationRead } from "@/server/people";
import { PersonActions } from "../../people/PersonActions";
import { Composer } from "./Composer";
import styles from "./conversation.module.css";

export const metadata: Metadata = { title: "Conversation" };

type Props = { params: Promise<{ slug: string; id: string }> };

/** A conversation between two connected participants (FR-18, UC-04). Private to the two of them. */
export default async function ConversationPage({ params }: Props) {
  const { slug, id } = await params;
  const event = getEventBySlug(slug);
  if (!event) notFound();
  const { viewer } = await requireMember(event.id);
  const current = now();
  let connection;
  try {
    connection = getConnection(event.id, id, viewer.id);
  } catch {
    notFound();
  }
  const other = getProfile(connection.otherId);
  if (!other) notFound();
  const profile = visibleProfile(other, viewer.id);
  const name = firstName(other.name);
  const thread = connection.status === "accepted" ? listMessages(connection.id) : [];
  const markedRead = markConversationRead(event.id, connection.id, viewer.id, current);

  let lastDay = "";
  return (
    <div className={styles.page}>
      <RefreshOnce when={markedRead > 0} />
      <Link href={`/e/${slug}/people`} className={styles.back}>
        <Icon name="back" />
        People
      </Link>

      <Link href={`/e/${slug}/people/${other.userId}`} className={styles.who}>
        <Avatar name={other.name} size="lg" />
        <span>
          <span className={styles.name}>{profile.name}</span>
          {profile.title || profile.organization ? (
            <span className={styles.meta}>{[profile.title, profile.organization].filter(Boolean).join(", ")}</span>
          ) : null}
        </span>
      </Link>

      {connection.status === "pending" && connection.direction === "outgoing" ? (
        <p className={styles.notice}>
          <Icon name="requested" /> You can message once {name} accepts your request.
        </p>
      ) : null}
      {connection.status === "pending" && connection.direction === "incoming" ? (
        <div className={styles.notice}>
          <p>{name} wants to connect. Accept to start a conversation.</p>
          <PersonActions slug={slug} state={{ kind: "incoming", connectionId: connection.id, name }} size="md" />
        </div>
      ) : null}
      {connection.status === "declined" ? <p className={styles.notice}>Messaging isn&apos;t available for this request.</p> : null}

      {connection.status === "accepted" ? (
        <>
          <p className={styles.private}>
            <Icon name="private" size={16} /> Only you and {name} can see these messages.
          </p>
          {thread.length ? (
            <ol className={styles.thread} aria-label={`Conversation with ${name}`}>
              {thread.map((m) => {
                const day = dayKey(m.createdAt, event.timeZone);
                const showDay = day !== lastDay;
                lastDay = day;
                const mine = m.senderId === viewer.id;
                return (
                  <li key={m.id} className={styles.item}>
                    {showDay ? <p className={styles.day}>{formatDay(m.createdAt, event.timeZone)}</p> : null}
                    <div className={`${styles.message} ${mine ? styles.mine : ""}`}>
                      <p className={styles.sender}>
                        {mine ? "You" : name} · <span className={styles.time}>{formatTime(m.createdAt, event.timeZone)}</span>
                      </p>
                      <p className={styles.body}>{m.body}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className={styles.meta}>{name} accepted your request. You can message now.</p>
          )}
          <Composer slug={slug} connectionId={connection.id} name={name} />
        </>
      ) : null}
    </div>
  );
}
