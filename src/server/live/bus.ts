// In-process event bus for live updates (no Redis in the demo). Kept on globalThis so every
// route bundle in `next dev` shares one instance. SSE streams subscribe; services publish.
import { EventEmitter } from "node:events";

export type LiveEvent =
  /** New stored notifications for these users (ids are the notification ids). */
  | { type: "notifications"; eventId: string; byUser: Record<string, number[]> }
  /** A session changed (time, room, cancel): every open program view refreshes. */
  | { type: "program"; eventId: string; sessionId: string; change: "rescheduled" | "room_change" | "canceled" | "updated" }
  /** The demo clock moved. */
  | { type: "clock" }
  /** Stats changed (organizer desk). */
  | { type: "stats"; eventId: string };

const globalForBus = globalThis as unknown as { __agoraBus?: EventEmitter };

function bus(): EventEmitter {
  if (!globalForBus.__agoraBus) {
    globalForBus.__agoraBus = new EventEmitter();
    // One listener per open tab; the demo has a handful, a real event has thousands (that's Redis' job later).
    globalForBus.__agoraBus.setMaxListeners(0);
  }
  return globalForBus.__agoraBus;
}

export function publish(event: LiveEvent): void {
  bus().emit("live", event);
}

export function subscribe(listener: (event: LiveEvent) => void): () => void {
  bus().on("live", listener);
  return () => bus().off("live", listener);
}

export function listenerCount(): number {
  return bus().listenerCount("live");
}
