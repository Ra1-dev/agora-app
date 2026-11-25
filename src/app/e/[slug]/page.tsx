import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { ProgrammeList, ProgrammeRow } from "@/components/ProgrammeRow";
import { StatusChip } from "@/components/StatusChip";
import { requireMember } from "@/lib/auth/current-user";
import { now } from "@/lib/clock";
import { formatAgo, formatDateSpan } from "@/lib/time";
import { latestAnnouncement } from "@/server/announcements";
import { generatedCover } from "@/server/cover";
import { getEventBySlug, isEventLive } from "@/server/events";
import { loadProgram, sessionsByIds } from "@/server/program";
import { toRow, viewerContext } from "@/server/rows";
import styles from "./home.module.css";

type Props = { params: Promise<{ slug: string }> };

/** Event home: cover, latest announcement, "Up next" from My schedule (S05 §05.2). */
export default async function EventHome({ params }: Props) {
  const event = getEventBySlug((await params).slug);
  if (!event) notFound();
  const { viewer } = await requireMember(event.id);
  const current = now();
  const program = loadProgram(event);
  const ctx = viewerContext(event, program, viewer.id, current);
  const announcement = latestAnnouncement(event.id, current);

  const saved = sessionsByIds(program, ctx.savedIds);
  const upNext = saved.filter((s) => !s.canceled && s.endsAt > current).slice(0, 3);
  const coverLight = event.coverUrl ? null : generatedCover(event.slug, "light");
  const coverDark = event.coverUrl ? null : generatedCover(event.slug, "dark");

  return (
    <div className={styles.page}>
      <section className={styles.cover} aria-label={event.name}>
        {event.coverUrl ? (
          <img className={styles.coverArt} src={event.coverUrl} alt="" />
        ) : (
          <>
            {coverLight ? <div className={`${styles.coverArt} ag-only-light`} dangerouslySetInnerHTML={{ __html: coverLight }} /> : null}
            {coverDark ? <div className={`${styles.coverArt} ag-only-dark`} dangerouslySetInnerHTML={{ __html: coverDark }} /> : null}
          </>
        )}
        <div className={styles.coverText}>
          <h1 className={styles.eventName}>{event.name}</h1>
          <p className={styles.coverMeta}>
            {formatDateSpan(event.startsOn, event.endsOn)}, {event.city}
            {isEventLive(event, current) ? <StatusChip status="live" /> : null}
          </p>
        </div>
      </section>

      {announcement ? (
        <aside className={styles.announcement} aria-label="Latest announcement">
          <Icon name="announcement" className={styles.announcementIcon} />
          <div>
            <p className={`${styles.from} ag-label-caps`}>
              From the organizer · {formatAgo(announcement.publishedAt, current, event.timeZone)}
            </p>
            <p className={styles.announcementBody}>{announcement.body}</p>
          </div>
        </aside>
      ) : null}

      <section className={styles.section} aria-labelledby="up-next">
        <div className={styles.sectionHead}>
          <h2 id="up-next">Up next</h2>
          <Link href={`/e/${event.slug}/program`} className={styles.textLink}>
            Full program
          </Link>
        </div>
        {upNext.length ? (
          <ProgrammeList label="Up next in My schedule">
            {upNext.map((s) => (
              <ProgrammeRow
                key={s.id}
                row={toRow(s, ctx)}
                slug={event.slug}
                timeZone={event.timeZone}
                ink={program.inks.get(s.track.id)}
              />
            ))}
          </ProgrammeList>
        ) : (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>{saved.length ? "Nothing else coming up" : "Your schedule is empty"}</p>
            <p className={styles.muted}>
              {saved.length
                ? "Everything you saved has ended. The program has more."
                : "Save sessions from the program and they'll show up here, in time order."}
            </p>
          </div>
        )}
      </section>

      <ButtonLink href={`/e/${event.slug}/schedule`} variant="primary" size="lg" icon="schedule" block>
        Open my schedule
      </ButtonLink>

      <Link href={`/e/${event.slug}/about`} className={styles.about}>
        About this event
      </Link>
    </div>
  );
}
