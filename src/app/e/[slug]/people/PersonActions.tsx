"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button, buttonClass } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";

export type PersonState =
  | { kind: "connect"; userId: string; name: string }
  | { kind: "requested" }
  | { kind: "incoming"; connectionId: string; name: string }
  | { kind: "message"; connectionId: string }
  | { kind: "none" };

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (res.ok) return null;
  const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
  return data.error?.message ?? "We couldn't do that. Try again.";
}

/** Connect → Requested → Message (S12 §12.5). Incoming requests: Decline / Accept. */
export function PersonActions({ slug, state, size = "sm" }: { slug: string; state: PersonState; size?: "sm" | "md" }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const run = (url: string, body: unknown, success: string) =>
    startTransition(async () => {
      const error = await post(url, body);
      if (error) {
        toast({ message: error, tone: "error" });
        return;
      }
      router.refresh();
      toast({ message: success });
    });

  switch (state.kind) {
    case "connect":
      return (
        <Button
          size={size}
          variant="secondary"
          disabled={pending}
          onClick={() =>
            run(`/api/e/${slug}/connections`, { userId: state.userId }, `Request sent. You can message once ${state.name} accepts.`)
          }
        >
          Connect
        </Button>
      );
    case "requested":
      return (
        <Button size={size} variant="secondary" disabled icon="requested">
          Requested
        </Button>
      );
    case "incoming":
      return (
        <span style={{ display: "inline-flex", gap: "var(--ag-space-2)" }}>
          <Button
            size={size}
            variant="secondary"
            disabled={pending}
            onClick={() => run(`/api/e/${slug}/connections/${state.connectionId}`, { action: "decline" }, `Declined ${state.name}'s request.`)}
          >
            Decline
          </Button>
          <Button
            size={size}
            variant="primary"
            disabled={pending}
            onClick={() =>
              run(`/api/e/${slug}/connections/${state.connectionId}`, { action: "accept" }, `You and ${state.name} are connected. You can message now.`)
            }
          >
            Accept
          </Button>
        </span>
      );
    case "message":
      return (
        <Link href={`/e/${slug}/messages/${state.connectionId}`} className={buttonClass({ variant: "primary", size })}>
          <Icon name="message" size={size === "sm" ? 16 : 20} />
          Message
        </Link>
      );
    default:
      return null;
  }
}
