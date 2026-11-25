"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { Button } from "@/components/Button";

async function markRead(slug: string, body: { ids?: number[]; all?: boolean }) {
  await fetch(`/api/e/${slug}/notifications/read`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function MarkAllRead({ slug }: { slug: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="secondary"
      size="sm"
      icon="check"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await markRead(slug, { all: true });
          router.refresh();
        })
      }
    >
      Mark all as read
    </Button>
  );
}

/** Opening a notification marks it read. */
export function InboxLink({ slug, id, href, unread, className, children }: { slug: string; id: number; href: string; unread: boolean; className?: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        if (unread) void markRead(slug, { ids: [id] });
      }}
    >
      {children}
    </Link>
  );
}

export function MarkOneRead({ slug, id }: { slug: string; id: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="text"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await markRead(slug, { ids: [id] });
          router.refresh();
        })
      }
    >
      Mark as read
    </Button>
  );
}
