import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ShellHeader } from "@/components/ShellHeader";
import { StatusChip } from "@/components/StatusChip";
import { currentUser } from "@/lib/auth/current-user";
import { now } from "@/lib/clock";
import { formatDateSpan } from "@/lib/time";
import { isEventLive, listEventsForUser } from "@/server/events";
import { JoinWithCode } from "./JoinWithCode";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "My events" };
export const dynamic = "force-dynamic";

/** My events: the only AGORA-owned list (design-decisions §8). */
export default async function MyEventsPage() {
  const viewer = await currentUser("participant");
  const events = listEventsForUser(viewer.id).filter((e) => e.role === "participant");
  const current = now();

  return (
    <>
      <ShellHeader />
      <main className={styles.main}>
        <h1 className={styles.title}>My events</h1>

        {events.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No events yet</p>
            <p className={styles.muted}>Join with the code from your badge or invitation, and the event shows up here.</p>
          </div>
        ) : (
          <ul className={styles.list}>
            {events.map((event) => {
              const live = isEventLive(event, current);
              return (
                <li key={event.id}>
                  <Link href={`/e/${event.slug}`} className={styles.row}>
                    {/* The organizer's mark, never recoloured (S07). */}
                    <img className={styles.mark} src={event.markUrl ?? event.logoUrl} alt="" width={44} height={44} />
                    <span className={styles.text}>
                      <span className={styles.name}>{event.name}</span>
                      <span className={styles.muted}>
                        {formatDateSpan(event.startsOn, event.endsOn)}, {event.city}
                      </span>
                    </span>
                    {live ? <StatusChip status="live" /> : <Icon name="chevron-right" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <JoinWithCode />
        <p className={styles.footnote}>Past events and your certificates stay here.</p>
      </main>
    </>
  );
}
