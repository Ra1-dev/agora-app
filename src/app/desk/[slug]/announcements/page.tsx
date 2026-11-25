import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, count, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { memberships } from "@/db/schema";
import { requireOrganizer } from "@/lib/auth/current-user";
import { now } from "@/lib/clock";
import { formatAgo, formatDay, formatTime } from "@/lib/time";
import { getEventBySlug } from "@/server/events";
import { listAnnouncements } from "@/server/organizer";
import { AnnouncementComposer } from "./Composer";
import styles from "./announcements.module.css";

export const metadata: Metadata = { title: "Announcements" };

const fmt = new Intl.NumberFormat("en-US");

/** Announcements (FR-07): compose, publish to everyone, see how many people each one reached. */
export default async function AnnouncementsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event) notFound();
  await requireOrganizer(event.id);
  const current = now();
  const audience =
    getDb()
      .select({ n: count() })
      .from(memberships)
      .where(and(eq(memberships.eventId, event.id), eq(memberships.role, "participant")))
      .get()?.n ?? 0;
  const list = listAnnouncements(event.id).filter((a) => a.publishedAt <= current);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Announcements</h1>
      <AnnouncementComposer slug={slug} audience={audience} />

      <section className={styles.section} aria-labelledby="published">
        <h2 id="published">Published</h2>
        {list.length ? (
          <ol className={styles.list}>
            {list.map((a) => {
              const share = a.recipientCount ? a.reached / a.recipientCount : 0;
              return (
                <li key={a.id} className={styles.item}>
                  <p className={styles.body}>{a.body}</p>
                  <p className={styles.meta}>
                    {formatDay(a.publishedAt, event.timeZone)}, {formatTime(a.publishedAt, event.timeZone)} ·{" "}
                    {formatAgo(a.publishedAt, current, event.timeZone)}
                  </p>
                  <p className={styles.reach}>
                    Reached {fmt.format(a.reached)} of {fmt.format(a.recipientCount)} people.
                    <span className={styles.reachBar} aria-hidden="true">
                      <span style={{ width: `${share * 100}%` }} />
                    </span>
                  </p>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className={styles.hint}>Nothing published yet.</p>
        )}
        <p className={styles.hint}>&ldquo;Reached&rdquo; counts people whose app received the announcement, live or when they came back.</p>
      </section>
    </div>
  );
}
