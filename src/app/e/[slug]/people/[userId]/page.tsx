import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { requireMember } from "@/lib/auth/current-user";
import { shortName } from "@/lib/text";
import { getEventBySlug } from "@/server/events";
import { getProfile } from "@/server/people";
import { peopleContext, personCard } from "@/server/people-view";
import { PersonActions } from "../PersonActions";
import styles from "../people.module.css";

type Props = { params: Promise<{ slug: string; userId: string }> };

export const metadata: Metadata = { title: "Person" };

/** A participant as others see them: only the fields they made visible (FR-09). */
export default async function PersonPage({ params }: Props) {
  const { slug, userId } = await params;
  const event = getEventBySlug(slug);
  if (!event) notFound();
  const { viewer: v } = await requireMember(event.id);
  if (userId === v.id) {
    return (
      <div className={styles.page}>
        <p>
          This is you. <Link href={`/e/${slug}/profile`} className={styles.inlineLink}>Edit your profile</Link> to change what others see.
        </p>
      </div>
    );
  }
  const viewer = getProfile(v.id)!;
  const { everyone, byOther } = peopleContext(event.id, viewer);
  const other = everyone.find((p) => p.userId === userId);
  if (!other) notFound(); // Not at this event, or nothing visible.

  const card = personCard(viewer, other, byOther.get(userId));
  const { profile } = card;
  const shared = new Set(viewer.interests.map((i) => i.toLowerCase()));

  return (
    <article className={styles.page}>
      <Link href={`/e/${slug}/people`} className={styles.back}>
        <Icon name="back" />
        People
      </Link>

      <div className={styles.hero}>
        <Avatar name={profile.name} size="xl" />
        <div>
          <h1 className={styles.fullName}>{profile.name}</h1>
          {profile.title || profile.organization ? (
            <p className={styles.muted}>{[profile.title, profile.organization].filter(Boolean).join(", ")}</p>
          ) : null}
        </div>
      </div>

      {card.line ? <p className={card.line.tone === "accent" ? styles.reason : styles.muted}>{card.line.text}</p> : null}
      <div>
        <PersonActions slug={slug} state={card.state} size="md" />
      </div>

      {profile.bio ? (
        <section className={styles.field}>
          <h2 className={styles.fieldTitle}>About</h2>
          <p>{profile.bio}</p>
        </section>
      ) : null}

      {profile.interests?.length ? (
        <section className={styles.field}>
          <h2 className={styles.fieldTitle}>Interests</h2>
          <ul className={styles.tags}>
            {profile.interests.map((i) => (
              <li key={i} className={`${styles.tag} ${shared.has(i.toLowerCase()) ? styles.tagShared : ""}`}>
                {shared.has(i.toLowerCase()) ? <span className="ag-sr-only">You both follow </span> : null}
                {i}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {profile.skills?.length ? (
        <section className={styles.field}>
          <h2 className={styles.fieldTitle}>Skills</h2>
          <p>{profile.skills.join(", ")}</p>
        </section>
      ) : null}

      <p className={styles.meta}>{shortName(profile.name)} chose what to show here. Hidden fields are not shared with anyone.</p>
    </article>
  );
}
