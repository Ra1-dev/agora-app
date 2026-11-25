// How a notification is shown: where it leads and which icon and tone it gets (S12 §12.6).
import type { IconName } from "@/components/icon-names";

export type NotificationLike = {
  id: number;
  kind:
    | "room_change"
    | "rescheduled"
    | "canceled"
    | "connection_request"
    | "connection_accepted"
    | "message"
    | "announcement"
    | "starts_soon";
  title: string;
  body: string;
  sessionId: string | null;
  connectionId: string | null;
  createdAt: number;
};

export type Presentation = { icon: IconName; tone: "warning" | "error" | "accent" | "muted"; href: string | null; action: string | null };

export function present(slug: string, n: Pick<NotificationLike, "kind" | "sessionId" | "connectionId">): Presentation {
  const session = n.sessionId ? `/e/${slug}/sessions/${n.sessionId}` : null;
  const conversation = n.connectionId ? `/e/${slug}/messages/${n.connectionId}` : null;
  switch (n.kind) {
    case "room_change":
      return { icon: "room", tone: "warning", href: session, action: "View" };
    case "rescheduled":
      return { icon: "rescheduled", tone: "warning", href: session, action: "View" };
    case "canceled":
      return { icon: "canceled", tone: "error", href: session, action: "View" };
    case "starts_soon":
      return { icon: "time", tone: "accent", href: session, action: "View" };
    case "connection_request":
      return { icon: "connect", tone: "accent", href: `/e/${slug}/people`, action: "View" };
    case "connection_accepted":
      return { icon: "connected", tone: "accent", href: conversation, action: "Message" };
    case "message":
      return { icon: "message", tone: "accent", href: conversation, action: "Reply" };
    case "announcement":
      return { icon: "announcement", tone: "accent", href: null, action: null };
  }
}

/** The payload sent over SSE. */
export type LiveNotification = Pick<NotificationLike, "id" | "kind" | "title" | "body" | "createdAt"> & {
  href: string | null;
  action: string | null;
};

export function toLive(slug: string, n: NotificationLike): LiveNotification {
  const p = present(slug, n);
  return { id: n.id, kind: n.kind, title: n.title, body: n.body, createdAt: n.createdAt, href: p.href, action: p.action };
}
