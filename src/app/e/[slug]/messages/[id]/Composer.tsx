"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import styles from "./conversation.module.css";

export function Composer({ slug, connectionId, name }: { slug: string; connectionId: string; name: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const send = () => {
    if (!body.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/e/${slug}/connections/${connectionId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        setError(data.error?.message ?? "We couldn't send this. Try again.");
        return;
      }
      setBody("");
      router.refresh();
    });
  };

  return (
    <form
      className={styles.composer}
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <label htmlFor="message-body" className="ag-sr-only">
        Message to {name}
      </label>
      <textarea
        id="message-body"
        className={styles.input}
        rows={2}
        maxLength={2000}
        placeholder={`Message ${name}`}
        value={body}
        aria-invalid={error ? true : undefined}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
      />
      <Button type="submit" variant="primary" size="lg" icon="send" disabled={pending || !body.trim()}>
        Send
      </Button>
      {error ? (
        <p className={styles.error} role="alert">
          <Icon name="alert" size={16} /> {error}
        </p>
      ) : null}
    </form>
  );
}
