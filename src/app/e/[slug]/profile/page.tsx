import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { requireMember } from "@/lib/auth/current-user";
import { getEventBySlug } from "@/server/events";
import { allInterests, getEmail, getProfile } from "@/server/people";
import { ProfileForm } from "./ProfileForm";
import styles from "./profile.module.css";

export const metadata: Metadata = { title: "Profile" };

/** Your profile at this event (UC-01). */
export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const event = getEventBySlug((await params).slug);
  if (!event) notFound();
  const { viewer } = await requireMember(event.id);
  const profile = getProfile(viewer.id)!;

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <Avatar name={profile.name} size="xl" />
        <div>
          <h1 className={styles.title}>{profile.name}</h1>
          <p className={styles.hint}>Your name is always visible. Everything else is up to you.</p>
        </div>
      </div>
      <ProfileForm
        key={viewer.id}
        slug={event.slug}
        allInterests={allInterests()}
        initial={{
          email: getEmail(viewer.id),
          organization: profile.organization ?? "",
          title: profile.title ?? "",
          bio: profile.bio ?? "",
          skills: [...profile.skills],
          interests: [...profile.interests],
          networkingOptIn: profile.networkingOptIn,
          visibility: { ...profile.visibility },
        }}
      />
    </div>
  );
}
