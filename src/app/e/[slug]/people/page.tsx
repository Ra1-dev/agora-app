import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { UrlSearch } from "@/components/UrlSearch";
import { requireMember } from "@/lib/auth/current-user";
import { privacySummary } from "@/lib/people/visibility";
import { shortName, truncate } from "@/lib/text";
import { getEventBySlug } from "@/server/events";
import { getProfile, lastMessages } from "@/server/people";
import { peopleContext, personCard, suggestionsFor } from "@/server/people-view";
import { PersonRow } from "./PersonRow";
import styles from "./people.module.css";

export const metadata: Metadata = { title: "People" };

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string }> };

/** People (FR-16–FR-18, UC-04): requests, connections, suggestions with reasons, everyone visible. */
export default async function PeoplePage({ params, searchParams }: Props) {
  const event = getEventBySlug((await params).slug);
  if (!event) notFound();
  const { viewer: v } = await requireMember(event.id);
  const viewer = getProfile(v.id)!;
  const q = ((await searchParams).q ?? "").trim().toLowerCase();
  const { everyone, connections, byOther } = peopleContext(event.id, viewer);
  const byId = new Map(everyone.map((p) => [p.userId, p]));
  const card = (id: string) => {
    const p = byId.get(id);
    return p ? personCard(viewer, p, byOther.get(id)) : null;
  };

  const incoming = connections.filter((c) => c.status === "pending" && c.direction === "incoming");
  const accepted = connections.filter((c) => c.status === "accepted");
  const outgoing = connections.filter((c) => c.status === "pending" && c.direction === "outgoing");
  const suggestions = suggestionsFor(viewer, everyone, byOther);
  const previews = lastMessages(accepted.map((c) => c.id));
  const shown = new Set<string>([...connections.map((c) => c.otherId), ...suggestions.map((s) => String(s.userId))]);

  const matches = (id: string) => {
    if (!q) return true;
    const c = card(id);
    if (!c) return false;
    const p = c.profile;
    return [p.name, p.title, p.organization, ...(p.interests ?? [])].some((f) => f?.toLowerCase().includes(q));
  };
  const rest = everyone.filter((p) => (q ? true : !shown.has(String(p.userId)))).filter((p) => matches(String(p.userId)));

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>People</h1>
        <Link href={`/e/${event.slug}/profile`} className={styles.profileLink}>
          <Icon name="profile" />
          Your profile
        </Link>
      </div>

      <p className={styles.privacy}>
        <Icon name={viewer.networkingOptIn ? "visible" : "hidden"} className={styles.privacyIcon} />
        <span>
          {viewer.networkingOptIn
            ? privacySummary(viewer.visibility).replace(" Change this in Profile.", "")
            : "You're not open to networking, so others can't find you or send requests. Turn it on in Profile to connect."}{" "}
          <Link href={`/e/${event.slug}/profile`} className={styles.inlineLink}>
            Edit profile
          </Link>
        </span>
      </p>

      <UrlSearch id="people-search" label="Search people" placeholder="Search people, organizations, interests" />

      {!q && incoming.length ? (
        <section className={styles.section} aria-labelledby="requests">
          <h2 id="requests" className={styles.sectionTitle}>
            Requests <span className={styles.count}>{incoming.length}</span>
          </h2>
          <ul className={styles.list}>
            {incoming.map((c) => {
              const pc = card(c.otherId);
              return pc ? <PersonRow key={c.id} slug={event.slug} card={pc} /> : null;
            })}
          </ul>
        </section>
      ) : null}

      {!q && accepted.length ? (
        <section className={styles.section} aria-labelledby="connections">
          <h2 id="connections" className={styles.sectionTitle}>
            Connections
          </h2>
          <ul className={styles.list}>
            {accepted.map((c) => {
              const pc = card(c.otherId);
              const last = previews.get(c.id);
              const preview = last ? `${last.senderId === viewer.userId ? "You" : shortName(pc?.profile.name ?? "")}: ${truncate(last.body, 70)}` : undefined;
              return pc ? <PersonRow key={c.id} slug={event.slug} card={{ ...pc, line: last ? null : pc.line }} preview={preview} /> : null;
            })}
          </ul>
        </section>
      ) : null}

      {!q ? (
        <section className={styles.section} aria-labelledby="suggested">
          <h2 id="suggested" className={styles.sectionTitle}>
            Suggested for you
          </h2>
          {suggestions.length ? (
            <ul className={styles.list}>
              {suggestions.map((s) => {
                const pc = card(String(s.userId));
                return pc ? <PersonRow key={String(s.userId)} slug={event.slug} card={pc} /> : null;
              })}
            </ul>
          ) : (
            <p className={styles.muted}>
              {!viewer.networkingOptIn
                ? "Suggestions appear when you're open to networking."
                : viewer.interests.length
                  ? "No one else follows your interests yet. Check back later, or add more interests in Profile."
                  : "Add your interests in Profile to see people who share them."}
            </p>
          )}
        </section>
      ) : null}

      {!q && outgoing.length ? (
        <section className={styles.section} aria-labelledby="sent">
          <h2 id="sent" className={styles.sectionTitle}>
            Sent requests
          </h2>
          <ul className={styles.list}>
            {outgoing.map((c) => {
              const pc = card(c.otherId);
              return pc ? <PersonRow key={c.id} slug={event.slug} card={pc} /> : null;
            })}
          </ul>
        </section>
      ) : null}

      <section className={styles.section} aria-labelledby="everyone">
        <h2 id="everyone" className={styles.sectionTitle}>
          {q ? `People matching “${q}”` : "Everyone else at the event"}
        </h2>
        {rest.length ? (
          <ul className={styles.list}>
            {rest.map((p) => {
              const pc = card(String(p.userId));
              return pc ? <PersonRow key={String(p.userId)} slug={event.slug} card={pc} /> : null;
            })}
          </ul>
        ) : (
          <p className={styles.muted}>{q ? "No one matches. Try a name, an organization or an interest." : "That's everyone."}</p>
        )}
      </section>
    </div>
  );
}
