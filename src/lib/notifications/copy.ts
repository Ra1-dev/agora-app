// Notification copy (voice §4): say what changed and what to do. Shared by the seed and the app.
import { joinList, shortName, truncate } from "../text";
import { dayKey, formatTime, formatWeekdayTime } from "../time";

export type NotificationCopy = { title: string; body: string };

type SessionInfo = { title: string; startsAt: number; venueName: string };

/** "Small models on the edge is now in Hall C. Same time, 11:30." */
export function roomChangeCopy(session: SessionInfo, timeZone: string): NotificationCopy {
  return {
    title: "Room change",
    body: `${session.title} is now in ${session.venueName}. Same time, ${formatTime(session.startsAt, timeZone)}.`,
  };
}

/**
 * "Privacy by design now starts at 14:00 (was 11:30). Still in Hall B."
 * Names the weekday when the day changed, and the new room when that changed too.
 */
export function rescheduledCopy(
  session: SessionInfo & { prevStartsAt: number; prevVenueName: string },
  timeZone: string,
): NotificationCopy {
  const sameDay = dayKey(session.startsAt, timeZone) === dayKey(session.prevStartsAt, timeZone);
  const when = sameDay ? formatTime(session.startsAt, timeZone) : formatWeekdayTime(session.startsAt, timeZone);
  const was = sameDay ? formatTime(session.prevStartsAt, timeZone) : formatWeekdayTime(session.prevStartsAt, timeZone);
  const room =
    session.venueName === session.prevVenueName ? `Still in ${session.venueName}.` : `Now in ${session.venueName}.`;
  return { title: "Rescheduled", body: `${session.title} now starts at ${when} (was ${was}). ${room}` };
}

/** "Small models on the edge, Sat 11:30. It stays in My schedule, marked as canceled." */
export function canceledCopy(session: SessionInfo, timeZone: string): NotificationCopy {
  return {
    title: "Canceled",
    body: `${session.title}, ${formatWeekdayTime(session.startsAt, timeZone)}. It stays in My schedule, marked as canceled.`,
  };
}

/** "Designing for crowded rooms, Room 3." */
export function startsSoonCopy(session: SessionInfo): NotificationCopy {
  return { title: "Starts in 10 min", body: `${session.title}, ${session.venueName}.` };
}

/** "Madina O. wants to connect" / "UX lead. You both follow Accessibility." — visible fields only. */
export function connectionRequestCopy(requester: {
  name: string;
  title?: string;
  sharedVisibleInterests: readonly string[];
}): NotificationCopy {
  const parts: string[] = [];
  if (requester.title) parts.push(`${requester.title}.`);
  if (requester.sharedVisibleInterests.length) parts.push(`You both follow ${joinList(requester.sharedVisibleInterests)}.`);
  if (!parts.length) parts.push("Accept to start a conversation.");
  return { title: `${shortName(requester.name)} wants to connect`, body: parts.join(" ") };
}

export function connectionAcceptedCopy(recipientName: string): NotificationCopy {
  return { title: `${shortName(recipientName)} accepted your request`, body: "You can message now." };
}

export function messageCopy(senderName: string, text: string): NotificationCopy {
  return { title: shortName(senderName), body: truncate(text, 120) };
}

export function announcementCopy(text: string): NotificationCopy {
  return { title: "From the organizer", body: truncate(text, 280) };
}
