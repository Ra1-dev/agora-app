"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { plural } from "@/lib/text";
import styles from "./announcements.module.css";

const MAX = 500;

/** New announcement (FR-07): to everyone at the event. */
export function AnnouncementComposer({ slug, audience }: { slug: string; audience: number }) {
  const router = useRouter();
  const toast = useToast();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const publish = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/desk/${slug}/announcements`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = (await res.json().catch(() => ({}))) as { recipients?: number; error?: { message?: string } };
      if (!res.ok) {
        setError(data.error?.message ?? "We couldn't publish this. Try again.");
        return;
      }
      setBody("");
      router.refresh();
      toast({ message: `Published to ${plural(data.recipients ?? 0, "person", "people")}.` });
    });
  };

  return (
    <form
      className={styles.composer}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        publish();
      }}
    >
      <label htmlFor="announcement" className={styles.label}>
        New announcement
      </label>
      <textarea
        id="announcement"
        className={styles.input}
        rows={4}
        maxLength={MAX + 50}
        placeholder="Lunch is served on level 2 until 14:00."
        value={body}
        aria-invalid={error ? true : undefined}
        aria-describedby="announcement-hint"
        onChange={(e) => setBody(e.target.value)}
      />
      {error ? (
        <p id="announcement-hint" className={styles.error} role="alert">
          <Icon name="alert" size={16} />
          {error}
        </p>
      ) : (
        <p id="announcement-hint" className={styles.hint}>
          Say what changed and what to do. {body.length} of {MAX} characters.
        </p>
      )}
      <div className={styles.row}>
        <span className={styles.audience}>
          <Icon name="attendees" size={18} />
          Everyone at the event ({audience})
        </span>
        <Button type="submit" variant="primary" icon="send" disabled={pending || !body.trim()}>
          {pending ? "Publishing…" : "Publish"}
        </Button>
      </div>
    </form>
  );
}
