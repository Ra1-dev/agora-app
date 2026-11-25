import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { shortName } from "@/lib/text";
import type { PersonCard } from "@/server/people-view";
import { PersonActions } from "./PersonActions";
import styles from "./people.module.css";

/** Person row (S12 §12.5): avatar, name, visible role and organization, one reason or status line, action. */
export function PersonRow({ slug, card, preview }: { slug: string; card: PersonCard; preview?: string }) {
  const { profile, line, state } = card;
  const meta = [profile.title, profile.organization].filter(Boolean).join(", ");
  const off = !profile.networkingOptIn && state.kind === "none";
  return (
    <li className={`${styles.person} ${off ? styles.off : ""}`}>
      <Avatar name={profile.name} size="lg" />
      <div className={styles.personText}>
        <Link href={`/e/${slug}/people/${profile.userId}`} className={styles.personName}>
          {shortName(profile.name)}
        </Link>
        {meta ? <p className={styles.meta}>{meta}</p> : null}
        {line ? <p className={line.tone === "accent" ? styles.reason : styles.meta}>{line.text}</p> : null}
        {preview ? <p className={styles.preview}>{preview}</p> : null}
      </div>
      <div className={styles.actions}>
        <PersonActions slug={slug} state={state} />
      </div>
    </li>
  );
}
