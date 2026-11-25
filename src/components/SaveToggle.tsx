"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import type { SaveState } from "@/lib/schedule/row-state";
import { Icon } from "./Icon";
import { useToast } from "./Toast";
import styles from "./SaveToggle.module.css";

type Props = {
  slug: string;
  sessionId: string;
  title: string;
  state: SaveState;
  size?: "sm" | "md" | "lg";
  block?: boolean;
};

async function request(slug: string, sessionId: string, method: "POST" | "DELETE") {
  const res = await fetch(`/api/e/${slug}/saves/${sessionId}`, { method });
  if (res.ok) return null;
  const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
  return data.error?.message ?? "We couldn't save this. Try again.";
}

/**
 * Save is a two-state toggle (S12 §12.1): Save → Saved (green check). Never an icon instead of the word.
 * Canceled sessions show "Can't save" (disabled), or "Remove" if they were saved before.
 */
export function SaveToggle({ slug, sessionId, title, state, size = "sm", block }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(state);

  const run = (next: "saved" | "save", { undo = true } = {}) => {
    startTransition(async () => {
      setOptimistic(next === "saved" ? "saved" : state === "remove" ? "remove" : "save");
      const error = await request(slug, sessionId, next === "saved" ? "POST" : "DELETE");
      if (error) {
        toast({ message: error, tone: "error", action: { label: "Try again", onClick: () => run(next, { undo }) } });
        return;
      }
      router.refresh();
      if (!undo) return;
      toast(
        next === "saved"
          ? { message: "Saved to My schedule.", action: { label: "Undo", onClick: () => run("save", { undo: false }) } }
          : { message: `Removed ${title} from My schedule.`, action: { label: "Undo", onClick: () => run("saved", { undo: false }) } },
      );
    });
  };

  const cls = `${styles.button} ${styles[size]} ${block ? styles.block : ""}`;

  if (optimistic === "cant-save") {
    return (
      <button type="button" className={`${cls} ${styles.cant}`} disabled aria-describedby={`${sessionId}-cant`}>
        Can't save
        <span id={`${sessionId}-cant`} className="ag-sr-only">
          Canceled by the organizer. It can't be added to your schedule.
        </span>
      </button>
    );
  }

  if (optimistic === "remove") {
    return (
      <button type="button" className={`${cls} ${styles.saved}`} disabled={pending} onClick={() => run("save")}>
        Remove
      </button>
    );
  }

  const saved = optimistic === "saved";
  return (
    <button
      type="button"
      className={`${cls} ${saved ? styles.saved : styles.save}`}
      aria-pressed={saved}
      disabled={pending}
      onClick={() => run(saved ? "save" : "saved")}
    >
      {saved ? <Icon name="check" size={size === "sm" ? 16 : 20} className={styles.check} /> : null}
      {saved ? "Saved" : "Save"}
      <span className="ag-sr-only">: {title}</span>
    </button>
  );
}
