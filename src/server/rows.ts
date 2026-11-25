// Builds programme-row data for a viewer: saved state, overlaps, picks, check-ins.
import { rowState, type RowState } from "@/lib/schedule/row-state";
import { overlapIndex } from "@/lib/schedule/overlaps";
import type { PicksResult } from "@/lib/recs/picks";
import type { EventRow } from "./events";
import {
  checkedInSessionIds,
  declaredInterests,
  picksFor,
  savedSessionIds,
  type Program,
  type ProgramSession,
} from "./program";

export type ViewerContext = {
  now: number;
  timeZone: string;
  savedIds: Set<string>;
  checkedIn: Set<string>;
  overlaps: Map<string, string[]>;
  interests: string[];
  picks: PicksResult;
  pickReasons: Map<string, string>;
};

export type RowData = { session: ProgramSession; state: RowState };

export function viewerContext(event: EventRow, program: Program, viewerId: string, now: number): ViewerContext {
  const savedIds = savedSessionIds(event.id, viewerId);
  const saved = [...savedIds].flatMap((id) => {
    const s = program.byId.get(id);
    return s ? [{ id: s.id, startsAt: s.startsAt, endsAt: s.endsAt, canceled: s.canceled }] : [];
  });
  const overlaps = new Map<string, string[]>();
  for (const [id, others] of overlapIndex(saved)) {
    overlaps.set(id, others.map((o) => program.byId.get(o)?.title ?? ""));
  }
  const interests = declaredInterests(viewerId);
  const picks = picksFor(event, program, { interests, savedIds, now, limit: 50 });
  const pickReasons = new Map<string, string>();
  if (picks.mode === "interests") for (const p of picks.picks) pickReasons.set(String(p.sessionId), p.reason);
  return { now, timeZone: event.timeZone, savedIds, checkedIn: checkedInSessionIds(event.id, viewerId), overlaps, interests, picks, pickReasons };
}

export function toRow(session: ProgramSession, ctx: ViewerContext, { showPick = true } = {}): RowData {
  return {
    session,
    state: rowState(
      {
        title: session.title,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        canceled: session.canceled,
        venueName: session.venue.name,
        changeKind: session.changeKind,
        prevStartsAt: session.prevStartsAt,
        prevVenueName: session.prevVenue?.name ?? null,
      },
      {
        now: ctx.now,
        timeZone: ctx.timeZone,
        saved: ctx.savedIds.has(session.id),
        overlapsWith: ctx.overlaps.get(session.id) ?? [],
        pickReason: showPick ? (ctx.pickReasons.get(session.id) ?? null) : null,
        checkedIn: ctx.checkedIn.has(session.id),
      },
    ),
  };
}
