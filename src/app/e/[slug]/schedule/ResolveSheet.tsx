"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import { plural } from "@/lib/text";
import styles from "./schedule.module.css";

export type ResolveOption = { id: string; title: string; detail: string };

type Props = { slug: string; minutes: number; options: [ResolveOption, ResolveOption] };

/** "Keep which session?" (S12 §12.8): keep one, the other leaves My schedule; or decide later. */
export function ResolveSheet({ slug, minutes, options }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(true);
  const [keepId, setKeepId] = useState(options[0].id);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const base = `/e/${slug}/schedule`;

  const close = () => {
    setOpen(false);
    router.replace(base, { scroll: false });
  };

  const keep = options.find((o) => o.id === keepId)!;
  const remove = options.find((o) => o.id !== keepId)!;

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/e/${slug}/schedule/resolve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ keep: keep.id, remove: remove.id }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        setError(data.error?.message ?? "We couldn't update your schedule. Try again.");
        return;
      }
      setOpen(false);
      router.replace(base, { scroll: false });
      router.refresh();
      toast({
        message: `Kept ${keep.title}. Removed ${remove.title} from My schedule.`,
        action: {
          label: "Undo",
          onClick: () => {
            void fetch(`/api/e/${slug}/saves/${remove.id}`, { method: "POST" }).then(() => router.refresh());
          },
        },
      });
    });
  };

  return (
    <Sheet open={open} onClose={close} title="Keep which session?" description={`These two overlap by ${plural(minutes, "minute")}.`}>
      <form
        className={styles.resolveForm}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <fieldset className={styles.options}>
          <legend className="ag-sr-only">Session to keep</legend>
          {options.map((o) => (
            <label key={o.id} className={styles.option}>
              <input
                type="radio"
                name="keep"
                value={o.id}
                checked={keepId === o.id}
                onChange={() => setKeepId(o.id)}
                className={styles.radio}
              />
              <span className={styles.optionText}>
                <span className={styles.optionTitle}>{o.title}</span>
                <span className={styles.muted}>{o.detail}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <p className={styles.muted}>{remove.title} leaves My schedule. You can save it again from the program.</p>
        {error ? (
          <p className={styles.error} role="alert">
            <Icon name="alert" size={16} /> {error}
          </p>
        ) : null}
        <Button type="submit" variant="primary" size="lg" block disabled={pending}>
          {pending ? "Keeping…" : "Keep selected"}
        </Button>
        <Button variant="text" size="md" onClick={close} className={styles.later}>
          Decide later
        </Button>
      </form>
    </Sheet>
  );
}
