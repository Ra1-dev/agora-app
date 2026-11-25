"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { LiveNotification } from "@/lib/notifications/present";
import { plural, truncate } from "@/lib/text";
import { Icon } from "./Icon";
import { useToast } from "./Toast";
import styles from "./LiveUpdates.module.css";

type Props = { slug: string; since: number };

const OFFLINE_GRACE_MS = 2500;

/** Short toast line: what changed, in the notification's own words (voice §4). */
function toastText(n: LiveNotification): string {
  switch (n.kind) {
    case "message":
      return `${n.title}: ${truncate(n.body, 80)}`;
    case "connection_request":
    case "connection_accepted":
      return n.title + ".";
    case "announcement":
      return `From the organizer: ${truncate(n.body, 90)}`;
    case "starts_soon":
      return `Starts in 10 min: ${n.body}`;
    default:
      return n.body;
  }
}

/** Marks a programme row so it flashes once and its room slides in (S17). */
function flashRow(sessionId: string) {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-session-id="${CSS.escape(sessionId)}"]`)) {
    el.removeAttribute("data-flash");
    void el.offsetWidth; // restart the animation
    el.setAttribute("data-flash", "");
    window.setTimeout(() => el.removeAttribute("data-flash"), 1600);
  }
}

/**
 * Keeps an event tab live over Server-Sent Events: new notifications show a toast and refresh
 * the screen (badge, Inbox, rows); session changes refresh Program and My schedule without reload.
 */
export function LiveUpdates({ slug, since }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [offline, setOffline] = useState(false);
  const refreshTimer = useRef<number | undefined>(undefined);
  const offlineTimer = useRef<number | undefined>(undefined);
  const pendingFlash = useRef<string | null>(null);

  useEffect(() => {
    const refresh = () => {
      window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => {
        router.refresh();
        const id = pendingFlash.current;
        if (id) {
          pendingFlash.current = null;
          // Give the refreshed rows a moment to render.
          window.setTimeout(() => flashRow(id), 700);
        }
      }, 150);
    };

    const source = new EventSource(`/api/e/${slug}/stream?since=${since}`);

    source.addEventListener("open", () => {
      window.clearTimeout(offlineTimer.current);
      setOffline(false);
    });
    source.addEventListener("error", () => {
      window.clearTimeout(offlineTimer.current);
      offlineTimer.current = window.setTimeout(() => {
        if (source.readyState !== EventSource.OPEN) setOffline(true);
      }, OFFLINE_GRACE_MS);
    });
    source.addEventListener("ready", (e) => {
      const { missed } = JSON.parse((e as MessageEvent<string>).data) as { missed: number };
      if (missed > 1) {
        toast({
          message: `You missed ${plural(missed, "update")} while you were away.`,
          action: { label: "Open Inbox", onClick: () => router.push(`/e/${slug}/inbox`) },
        });
      }
      if (missed > 0) refresh();
    });
    source.addEventListener("notification", (e) => {
      const n = JSON.parse((e as MessageEvent<string>).data) as LiveNotification;
      const href = n.href;
      toast({
        message: toastText(n),
        tone: n.kind === "canceled" ? "error" : "default",
        action: href && n.action ? { label: n.action, onClick: () => router.push(href) } : undefined,
      });
      refresh();
    });
    source.addEventListener("program", (e) => {
      const { sessionId } = JSON.parse((e as MessageEvent<string>).data) as { sessionId: string };
      pendingFlash.current = sessionId;
      refresh();
    });
    source.addEventListener("clock", () => refresh());

    const goOffline = () => setOffline(true);
    window.addEventListener("offline", goOffline);
    return () => {
      source.close();
      window.removeEventListener("offline", goOffline);
      window.clearTimeout(refreshTimer.current);
      window.clearTimeout(offlineTimer.current);
    };
    // `since` is only the starting point; reconnects use Last-Event-ID.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (!offline) return null;
  return (
    <p className={styles.offline} role="status">
      <Icon name="offline" size={18} />
      You&apos;re offline. We&apos;ll show what you missed when you reconnect.
    </p>
  );
}
