// The programme row's state (design-decisions §3, S12 §12.4), computed from data so every screen
// shows the same session the same way. Copy follows voice §4.
import { formatTime, formatWeekdayTime, dayKey } from "../time";

export type RowInput = {
  title: string;
  startsAt: number;
  endsAt: number;
  canceled: boolean;
  venueName: string;
  changeKind: "rescheduled" | "room_change" | null;
  prevStartsAt: number | null;
  prevVenueName: string | null;
};

export type RowContext = {
  now: number;
  timeZone: string;
  saved: boolean;
  /** Titles of saved sessions this one overlaps with (only when this one is saved). */
  overlapsWith: string[];
  /** Reason line when the session is picked for the viewer. */
  pickReason: string | null;
  checkedIn?: boolean;
};

export type SaveState = "save" | "saved" | "cant-save" | "remove";

export type RowState = {
  live: boolean;
  ended: boolean;
  canceled: boolean;
  checkedIn: boolean;
  /** Struck-through old start, for "rescheduled". */
  oldStart: string | null;
  chips: ("live" | "rescheduled" | "room-change" | "canceled" | "checked-in" | "picked")[];
  /** Lines under the title, in order. Tone sets the colour; words always carry the meaning. */
  messages: { tone: "accent" | "warning" | "error" | "muted"; text: string }[];
  overlaps: boolean;
  save: SaveState;
};

function rescheduledLine(input: RowInput, timeZone: string): string {
  const prev = input.prevStartsAt ?? input.startsAt;
  const sameDay = dayKey(prev, timeZone) === dayKey(input.startsAt, timeZone);
  const fmt = sameDay ? formatTime : formatWeekdayTime;
  const room =
    input.prevVenueName && input.prevVenueName !== input.venueName ? `Now in ${input.venueName}.` : `Still in ${input.venueName}.`;
  return `Now ${fmt(input.startsAt, timeZone)} (was ${fmt(prev, timeZone)}). ${room}`;
}

export function rowState(input: RowInput, ctx: RowContext): RowState {
  const live = !input.canceled && input.startsAt <= ctx.now && ctx.now < input.endsAt;
  const ended = ctx.now >= input.endsAt;
  const chips: RowState["chips"] = [];
  const messages: RowState["messages"] = [];
  let oldStart: string | null = null;

  if (input.canceled) {
    chips.push("canceled");
    messages.push({ tone: "error", text: "Canceled by the organizer." });
  } else {
    if (live) {
      chips.push("live");
      messages.push({ tone: "muted", text: `Ends at ${formatTime(input.endsAt, ctx.timeZone)}.` });
    }
    if (input.changeKind === "rescheduled" && input.prevStartsAt !== null) {
      chips.push("rescheduled");
      oldStart = formatTime(input.prevStartsAt, ctx.timeZone);
      messages.push({ tone: "warning", text: rescheduledLine(input, ctx.timeZone) });
    } else if (input.changeKind === "room_change") {
      chips.push("room-change");
      messages.push({ tone: "warning", text: `Moved to ${input.venueName}. Same time, ${formatTime(input.startsAt, ctx.timeZone)}.` });
    }
    if (ctx.pickReason && !ctx.saved) {
      chips.push("picked");
      messages.push({ tone: "accent", text: ctx.pickReason });
    }
  }
  if (ctx.checkedIn) chips.push("checked-in");

  const overlaps = ctx.saved && !input.canceled && ctx.overlapsWith.length > 0;
  if (overlaps) messages.push({ tone: "warning", text: `Overlaps with ${ctx.overlapsWith.join(" and ")}.` });

  const save: SaveState = input.canceled ? (ctx.saved ? "remove" : "cant-save") : ctx.saved ? "saved" : "save";
  return { live, ended, canceled: input.canceled, checkedIn: Boolean(ctx.checkedIn), oldStart, chips, messages, overlaps, save };
}
