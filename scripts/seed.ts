// Builds data/agora.db with the fictional STEPPE AI Summit 2027 and generates its default cover.
// Deterministic: the same data on every run. Safe to run while `npm run dev` is up.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { DB_PATH, openDatabase } from "../src/db/client";
import * as t from "../src/db/schema";
import { CLOCK_KEY } from "../src/lib/clock";
import { DEMO_CLOCK_START } from "../src/lib/demo";
import {
  announcementCopy,
  canceledCopy,
  connectionAcceptedCopy,
  connectionRequestCopy,
  messageCopy,
  rescheduledCopy,
  startsSoonCopy,
} from "../src/lib/notifications/copy";
import { zonedTimeToUtc } from "../src/lib/time";
import {
  BULK_ATTENDEES,
  FIRST_NAMES,
  INTERESTS,
  LAST_NAMES,
  ORGANIZER,
  OTHER_CONNECTIONS,
  PEOPLE,
  type PersonSeed,
} from "./seed/people";
import { DAY_DATES, EVENT, PRIOR_CHANGES, SESSIONS, SPEAKERS, TRACKS, VENUES, type DayId } from "./seed/program";
import { createRng, int, pick, weightedSample } from "./seed/random";

const root = process.cwd();
const TZ = EVENT.timeZone;
const MIN = 60_000;
const HOUR = 60 * MIN;
const rng = createRng(20270515);

const at = (day: DayId | string, time: string) => zonedTimeToUtc(DAY_DATES[day as DayId] ?? day, time, TZ);
const NOW = at(DEMO_CLOCK_START.date, DEMO_CLOCK_START.time);
const SEED_STAMP = at("2027-04-01", "09:00");
const between = (from: number, to: number) => Math.round(from + rng() * Math.max(0, to - from));
const interestId = (label: string) => `in_${label.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;

/* ---------------- database reset ---------------- */

mkdirSync(join(root, "data"), { recursive: true });
const { sqlite, db } = openDatabase(DB_PATH);
sqlite.pragma("foreign_keys = OFF");
const existing = sqlite
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
  .all() as { name: string }[];
for (const { name } of existing) sqlite.exec(`DROP TABLE IF EXISTS "${name}"`);
sqlite.pragma("foreign_keys = ON");
migrate(db, { migrationsFolder: join(root, "drizzle") });

function insertChunked<T extends Record<string, unknown>>(table: Parameters<typeof db.insert>[0], rows: T[]) {
  for (let i = 0; i < rows.length; i += 400) db.insert(table).values(rows.slice(i, i + 400) as never).run();
}

/* ---------------- program ---------------- */

const sessionTimes = new Map<string, { startsAt: number; endsAt: number }>();
for (const s of SESSIONS) sessionTimes.set(s.id, { startsAt: at(s.day, s.start), endsAt: at(s.day, s.end) });
const venueName = (id: string) => VENUES.find((v) => v.id === id)!.name;
const sessionById = new Map(SESSIONS.map((s) => [s.id, s]));
const sessionInfo = (id: string) => {
  const s = sessionById.get(id)!;
  return { title: s.title, startsAt: sessionTimes.get(id)!.startsAt, venueName: venueName(s.venue) };
};

const resched = PRIOR_CHANGES.rescheduled;
const reschedAt = at(resched.changedAt.day, resched.changedAt.time);
const reschedSession = sessionById.get(resched.sessionId)!;
const prevStartsAt = at(reschedSession.day, resched.prevStart);
const prevEndsAt = at(reschedSession.day, resched.prevEnd);
const canceledAt = at(PRIOR_CHANGES.canceled.canceledAt.day, PRIOR_CHANGES.canceled.canceledAt.time);

const sessionsCanceled = new Set([PRIOR_CHANGES.canceled.sessionId]);

db.transaction(() => {
  db.insert(t.events)
    .values({
      id: EVENT.id,
      slug: EVENT.slug,
      name: EVENT.name,
      code: EVENT.code,
      startsOn: EVENT.startsOn,
      endsOn: EVENT.endsOn,
      timeZone: EVENT.timeZone,
      city: EVENT.city,
      venueName: EVENT.venueName,
      about: EVENT.about,
      organizerName: EVENT.organizerName,
      brandColor: EVENT.brandColor,
      logoUrl: EVENT.logoUrl,
      logoDarkUrl: EVENT.logoDarkUrl,
      markUrl: EVENT.markUrl,
      coverUrl: null, // level 1: generated cover
      defaultTheme: "light",
      publishedAt: SEED_STAMP,
    })
    .run();
  insertChunked(t.tracks, TRACKS.map((tr, i) => ({ ...tr, eventId: EVENT.id, position: i + 1 })));
  insertChunked(t.venues, VENUES.map((v, i) => ({ ...v, eventId: EVENT.id, position: i + 1 })));
  insertChunked(t.speakers, SPEAKERS.map((sp) => ({ ...sp, tags: [...sp.tags], eventId: EVENT.id })));
  insertChunked(
    t.sessions,
    SESSIONS.map((s) => {
      const { startsAt, endsAt } = sessionTimes.get(s.id)!;
      const isResched = s.id === resched.sessionId;
      const isCanceled = sessionsCanceled.has(s.id);
      return {
        id: s.id,
        eventId: EVENT.id,
        trackId: s.track,
        venueId: s.venue,
        title: s.title,
        abstract: s.abstract,
        format: s.format,
        startsAt,
        endsAt,
        status: isCanceled ? ("canceled" as const) : ("scheduled" as const),
        materialsUrl: `https://example.com/steppe27/materials/${s.id.replace(/^se_/, "")}`,
        changeKind: isResched ? ("rescheduled" as const) : null,
        prevStartsAt: isResched ? prevStartsAt : null,
        prevEndsAt: isResched ? prevEndsAt : null,
        prevVenueId: isResched ? s.venue : null,
        changedAt: isResched ? reschedAt : null,
        canceledAt: isCanceled ? canceledAt : null,
        createdAt: SEED_STAMP,
        updatedAt: isResched ? reschedAt : isCanceled ? canceledAt : SEED_STAMP,
      };
    }),
  );
  insertChunked(
    t.sessionSpeakers,
    SESSIONS.flatMap((s) => s.speakers.map((speakerId, position) => ({ sessionId: s.id, speakerId, position }))),
  );
});

/* ---------------- people ---------------- */

type Attendee = { id: string; name: string; detailed: PersonSeed | null; registeredAt: number };
const attendees: Attendee[] = [];

db.transaction(() => {
  insertChunked(t.interests, INTERESTS.map((label) => ({ id: interestId(label), label })));

  db.insert(t.users)
    .values({ id: ORGANIZER.id, name: ORGANIZER.name, email: "organizer@steppe-digital.example.com", createdAt: SEED_STAMP })
    .run();
  db.insert(t.profiles)
    .values({ userId: ORGANIZER.id, organization: ORGANIZER.organization, title: ORGANIZER.title, networkingOptIn: false, updatedAt: SEED_STAMP })
    .run();
  db.insert(t.memberships).values({ eventId: EVENT.id, userId: ORGANIZER.id, role: "organizer", registeredAt: SEED_STAMP }).run();

  PEOPLE.forEach((p, i) => {
    const registeredAt = between(at("2027-04-05", "09:00"), at("2027-05-12", "20:00")) + i;
    attendees.push({ id: p.id, name: p.name, detailed: p, registeredAt });
  });

  const usedNames = new Set(PEOPLE.map((p) => p.name));
  for (let i = 1; i <= BULK_ATTENDEES; i++) {
    let name = "";
    do name = `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`;
    while (usedNames.has(name));
    usedNames.add(name);
    // Most registered ahead of time; a few this morning, for "+N today".
    const registeredAt =
      rng() < 0.05 ? between(at("sat", "07:30"), NOW - 5 * MIN) : between(at("2027-04-01", "10:00"), at("sat", "07:00"));
    attendees.push({ id: `u_b${String(i).padStart(3, "0")}`, name, detailed: null, registeredAt });
  }

  insertChunked(
    t.users,
    attendees.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.detailed ? `${a.id.slice(2)}@example.com` : `attendee.${a.id.slice(3)}@example.com`,
      createdAt: a.registeredAt,
    })),
  );
  insertChunked(
    t.profiles,
    attendees.map((a) => {
      const p = a.detailed;
      if (!p) {
        // Lightweight attendee: registered, saves sessions, nothing visible, not in People.
        return {
          userId: a.id, organization: null, title: null, bio: null, skills: [], networkingOptIn: false,
          showOrganization: false, showTitle: false, showInterests: false, showBio: false, showSkills: false,
          updatedAt: a.registeredAt,
        };
      }
      return {
        userId: p.id,
        organization: p.organization,
        title: p.title,
        bio: p.bio || null,
        skills: p.skills,
        networkingOptIn: p.networking,
        showOrganization: p.show?.organization ?? true,
        showTitle: p.show?.title ?? true,
        showInterests: p.show?.interests ?? true,
        showBio: p.show?.bio ?? false,
        showSkills: p.show?.skills ?? false,
        updatedAt: a.registeredAt,
      };
    }),
  );
  insertChunked(
    t.userInterests,
    PEOPLE.flatMap((p) => p.interests.map((label, position) => ({ userId: p.id, interestId: interestId(label), position }))),
  );
  insertChunked(
    t.memberships,
    attendees.map((a) => ({ eventId: EVENT.id, userId: a.id, role: "participant" as const, registeredAt: a.registeredAt })),
  );
});

/* ---------------- saves, views, check-ins ---------------- */

const SCRIPTED_SAVES: Record<string, string[]> = {
  // One overlap (Small models on the edge × Privacy by design), one live now, one rescheduled, one canceled.
  u_dana: ["se_edge_micro", "se_wayfinding", "se_small_models", "se_privacy_design", "se_federated_clinics", "se_robots_wild"],
  u_aruzhan: ["se_edge_micro", "se_grippers", "se_small_models", "se_vision_drones", "se_closing_panel"],
  u_ruslan: ["se_opening"],
};
const SCRIPTED_CHECKINS: Record<string, [string, string, string][]> = {
  u_dana: [["se_edge_micro", "fri", "10:41"], ["se_wayfinding", "sat", "10:42"]],
  u_aruzhan: [["se_edge_micro", "fri", "10:39"], ["se_grippers", "sat", "10:44"]],
  u_ruslan: [["se_opening", "fri", "09:24"]],
};

const sessionText = (id: string) => {
  const s = sessionById.get(id)!;
  const tags = s.speakers.flatMap((sp) => SPEAKERS.find((x) => x.id === sp)!.tags);
  return `${s.title} ${s.abstract} ${tags.join(" ")}`.toLowerCase();
};

const saves: { userId: string; sessionId: string; savedAt: number }[] = [];
const latestSaveTime = (sessionId: string, registeredAt: number) => {
  const start = sessionTimes.get(sessionId)!.startsAt;
  let limit = Math.min(start - 10 * MIN, NOW - 5 * MIN);
  if (sessionsCanceled.has(sessionId)) limit = Math.min(limit, canceledAt - 30 * MIN);
  return Math.max(registeredAt + MIN, limit);
};

for (const a of attendees) {
  let chosen: string[];
  if (SCRIPTED_SAVES[a.id]) chosen = SCRIPTED_SAVES[a.id]!;
  else if (a.detailed) {
    const interests = a.detailed.interests.map((i) => i.toLowerCase());
    const matching = SESSIONS.filter((s) => interests.some((i) => sessionText(s.id).includes(i)));
    chosen = weightedSample(rng, matching, (s) => s.appeal, int(rng, 2, 5)).map((s) => s.id);
    if (rng() < 0.6) chosen.push(...weightedSample(rng, SESSIONS.filter((s) => !chosen.includes(s.id)), (s) => s.appeal, 1).map((s) => s.id));
  } else {
    chosen = weightedSample(rng, SESSIONS, (s) => s.appeal ** 1.6, int(rng, 3, 9)).map((s) => s.id);
  }
  for (const sessionId of chosen) {
    const latest = latestSaveTime(sessionId, a.registeredAt);
    // People who could only have saved after the session was canceled skip it (UC-02).
    if (sessionsCanceled.has(sessionId) && latest <= a.registeredAt + MIN && !SCRIPTED_SAVES[a.id]) continue;
    saves.push({ userId: a.id, sessionId, savedAt: between(a.registeredAt + MIN, latest) });
  }
}
// Dana saved the edge talks early in May.
for (const s of saves) if (s.userId === "u_dana") s.savedAt = between(at("2027-05-02", "10:00"), at("2027-05-10", "22:00"));

const interactionRows: { eventId: string; userId: string; sessionId: string; kind: (typeof t.INTERACTION_KINDS)[number]; createdAt: number }[] = [];
for (const s of saves) {
  interactionRows.push({ eventId: EVENT.id, userId: s.userId, sessionId: s.sessionId, kind: "view", createdAt: s.savedAt - int(rng, 1, 20) * 1000 });
  interactionRows.push({ eventId: EVENT.id, userId: s.userId, sessionId: s.sessionId, kind: "save", createdAt: s.savedAt });
}
// Extra views without a save.
for (const a of attendees) {
  for (const s of weightedSample(rng, SESSIONS, (x) => x.appeal, int(rng, 1, 5))) {
    interactionRows.push({ eventId: EVENT.id, userId: a.id, sessionId: s.id, kind: "view", createdAt: between(a.registeredAt, NOW - MIN) });
  }
}
// Check-ins for sessions that already started: most savers, plus a few walk-ins.
const savedBy = new Map<string, Set<string>>();
for (const s of saves) savedBy.set(s.sessionId, (savedBy.get(s.sessionId) ?? new Set()).add(s.userId));
const scriptedUsers = new Set(Object.keys(SCRIPTED_CHECKINS));
for (const s of SESSIONS) {
  const { startsAt } = sessionTimes.get(s.id)!;
  if (startsAt > NOW || sessionsCanceled.has(s.id)) continue;
  const savers = [...(savedBy.get(s.id) ?? [])].filter((u) => !scriptedUsers.has(u));
  const walkIns = attendees.filter((a) => !a.detailed && !savedBy.get(s.id)?.has(a.id) && rng() < 0.035 * s.appeal);
  for (const userId of [...savers.filter(() => rng() < 0.62), ...walkIns.map((a) => a.id)]) {
    interactionRows.push({ eventId: EVENT.id, userId, sessionId: s.id, kind: "check_in", createdAt: Math.min(NOW - MIN, startsAt - int(rng, 0, 12) * MIN) });
  }
}
for (const [userId, list] of Object.entries(SCRIPTED_CHECKINS)) {
  for (const [sessionId, day, time] of list) interactionRows.push({ eventId: EVENT.id, userId, sessionId, kind: "check_in", createdAt: at(day, time) });
}

db.transaction(() => {
  insertChunked(t.savedSessions, saves.map((s) => ({ ...s, eventId: EVENT.id })));
  insertChunked(t.interactions, interactionRows.sort((x, y) => x.createdAt - y.createdAt));
});

/* ---------------- connections and messages ---------------- */

const person = (id: string) => PEOPLE.find((p) => p.id === id)!;
const shared = (a: PersonSeed, b: PersonSeed) =>
  b.show?.interests === false ? [] : a.interests.filter((i) => b.interests.includes(i));

type NotificationRow = typeof t.notifications.$inferInsert;
const notificationRows: NotificationRow[] = [];
const note = (row: Omit<NotificationRow, "eventId">) => notificationRows.push({ eventId: EVENT.id, ...row });

const connectionRows: (typeof t.connections.$inferInsert)[] = [
  { id: "cn_dana_aruzhan", eventId: EVENT.id, requesterId: "u_dana", recipientId: "u_aruzhan", status: "accepted", createdAt: at("fri", "12:04"), respondedAt: at("fri", "16:05") },
  { id: "cn_dana_timur", eventId: EVENT.id, requesterId: "u_dana", recipientId: "u_timur", status: "pending", createdAt: at("sat", "09:50") },
  { id: "cn_madina_dana", eventId: EVENT.id, requesterId: "u_madina", recipientId: "u_dana", status: "pending", createdAt: at("sat", "10:05") },
];
OTHER_CONNECTIONS.forEach(([a, b], i) => {
  const createdAt = between(at("fri", "09:00"), at("sat", "09:00"));
  connectionRows.push({ id: `cn_${i + 1}`, eventId: EVENT.id, requesterId: a, recipientId: b, status: "accepted", createdAt, respondedAt: Math.min(createdAt + int(rng, 10, 300) * MIN, NOW - 30 * MIN) });
});
connectionRows.push(
  { id: "cn_pending_1", eventId: EVENT.id, requesterId: "u_marat", recipientId: "u_ilyas", status: "pending", createdAt: at("sat", "08:40") },
  { id: "cn_pending_2", eventId: EVENT.id, requesterId: "u_meruyert", recipientId: "u_togzhan", status: "pending", createdAt: at("sat", "09:15") },
  { id: "cn_declined_1", eventId: EVENT.id, requesterId: "u_hamid", recipientId: "u_chen", status: "declined", createdAt: at("fri", "13:00"), respondedAt: at("fri", "15:30") },
);

const thread: [string, string, string, string][] = [
  ["u_dana", "fri", "16:20", "Thanks for accepting. I liked your question about battery budgets in the microcontrollers talk."],
  ["u_aruzhan", "fri", "16:42", "Thanks! We run small models on sensors at Steppe Labs, happy to compare notes."],
  ["u_dana", "fri", "17:05", "Great. I'm going to Small models on the edge tomorrow at 11:30."],
  ["u_aruzhan", "sat", "08:20", "Are you staying for the closing panel?"],
];
const messageRows = thread.map(([senderId, day, time, body]) => ({ connectionId: "cn_dana_aruzhan", senderId, body, createdAt: at(day, time) }));

// Connection notifications.
for (const c of connectionRows) {
  const requester = person(c.requesterId);
  const recipient = person(c.recipientId);
  const pending = c.status === "pending";
  note({
    userId: c.recipientId,
    kind: "connection_request",
    ...connectionRequestCopy({ name: requester.name, title: requester.show?.title === false ? undefined : requester.title, sharedVisibleInterests: shared(recipient, requester) }),
    connectionId: c.id,
    actorId: c.requesterId,
    createdAt: c.createdAt,
    deliveredAt: c.createdAt,
    readAt: pending ? null : (c.respondedAt ?? null),
  });
  if (c.status === "accepted") {
    note({ userId: c.requesterId, kind: "connection_accepted", ...connectionAcceptedCopy(recipient.name), connectionId: c.id, actorId: c.recipientId, createdAt: c.respondedAt!, deliveredAt: c.respondedAt!, readAt: c.respondedAt! + 20 * MIN });
  }
}
for (const m of messageRows) {
  const to = m.senderId === "u_dana" ? "u_aruzhan" : "u_dana";
  const unread = m.createdAt === at("sat", "08:20");
  note({ userId: to, kind: "message", ...messageCopy(person(m.senderId).name, m.body), connectionId: "cn_dana_aruzhan", actorId: m.senderId, createdAt: m.createdAt, deliveredAt: unread ? null : m.createdAt, readAt: unread ? null : m.createdAt + 5 * MIN });
}

/* ---------------- announcements ---------------- */

const announcementRows = [
  { id: "an_welcome", publishedAt: at("fri", "08:30"), body: "Welcome to STEPPE AI Summit 2027. Badges are at the north entrance, and the program is in this app. Save sessions to get updates if anything changes." },
  { id: "an_coffee", publishedAt: at("sat", "08:45"), body: "Coffee is on level 2 until 10:30. Hall C is on the same floor." },
];
const deliveredForBulk = (sentAt: number) => (rng() < 0.86 ? sentAt + int(rng, 0, 90) * MIN : null);
for (const an of announcementRows) {
  for (const a of attendees) {
    if (a.registeredAt > an.publishedAt) continue;
    const deliveredAt = a.detailed ? an.publishedAt + int(rng, 0, 30) * MIN : deliveredForBulk(an.publishedAt);
    note({ userId: a.id, kind: "announcement", ...announcementCopy(an.body), announcementId: an.id, actorId: ORGANIZER.id, createdAt: an.publishedAt, deliveredAt: deliveredAt && Math.min(deliveredAt, NOW - MIN), readAt: deliveredAt && a.detailed ? Math.min(deliveredAt + 10 * MIN, NOW - MIN) : null });
  }
}

/* ---------------- organizer changes and reminders ---------------- */

const reschedCopy = rescheduledCopy(
  { ...sessionInfo(resched.sessionId), prevStartsAt, prevVenueName: venueName(reschedSession.venue) },
  TZ,
);
const cancelCopy = canceledCopy(sessionInfo(PRIOR_CHANGES.canceled.sessionId), TZ);
for (const s of saves) {
  const isDana = s.userId === "u_dana";
  if (s.sessionId === resched.sessionId && s.savedAt < reschedAt) {
    const delivered = isDana ? null : deliveredForBulk(reschedAt);
    note({ userId: s.userId, kind: "rescheduled", ...reschedCopy, sessionId: s.sessionId, createdAt: reschedAt, deliveredAt: delivered && Math.min(delivered, NOW - MIN), readAt: null });
  }
  if (sessionsCanceled.has(s.sessionId) && s.savedAt < canceledAt) {
    const delivered = isDana ? null : deliveredForBulk(canceledAt);
    note({ userId: s.userId, kind: "canceled", ...cancelCopy, sessionId: s.sessionId, createdAt: canceledAt, deliveredAt: delivered && Math.min(delivered, NOW - MIN), readAt: null });
  }
}
// "Starts in 10 min" for Dana's earlier saved sessions.
for (const sessionId of ["se_edge_micro", "se_wayfinding"]) {
  const sentAt = sessionTimes.get(sessionId)!.startsAt - 10 * MIN;
  note({ userId: "u_dana", kind: "starts_soon", ...startsSoonCopy(sessionInfo(sessionId)), sessionId, dedupeKey: `starts_soon:u_dana:${sessionId}`, createdAt: sentAt, deliveredAt: sentAt, readAt: sentAt + 2 * MIN });
}

db.transaction(() => {
  insertChunked(t.connections, connectionRows);
  insertChunked(t.messages, messageRows);
  insertChunked(
    t.announcements,
    announcementRows.map((an) => ({
      ...an,
      eventId: EVENT.id,
      authorId: ORGANIZER.id,
      audience: "everyone" as const,
      recipientCount: attendees.filter((a) => a.registeredAt <= an.publishedAt).length,
    })),
  );
  insertChunked(t.notifications, notificationRows.sort((x, y) => x.createdAt - y.createdAt));
  db.insert(t.appSettings).values({ key: CLOCK_KEY, value: JSON.stringify({ virtualAt: NOW, realAt: Date.now() }) }).run();
});

/* ---------------- generated cover (design-decisions §7) ---------------- */

const coverDir = join(root, "public", "covers", EVENT.slug);
rmSync(coverDir, { recursive: true, force: true });
mkdirSync(coverDir, { recursive: true });
const coverScript = join(root, "design", "agora-cover.mjs");
const nameSlug = EVENT.name.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
for (const theme of ["light", "dark"] as const) {
  const out = mkdtempSync(join(tmpdir(), "agora-cover-"));
  execFileSync(
    process.execPath,
    [coverScript, EVENT.name, "--meta", EVENT.coverMeta, "--ink", "org", "--org", EVENT.brandColor, "--theme", theme, "--out", out],
    { stdio: "ignore" },
  );
  for (const format of ["wide", "square", "story"]) {
    const from = join(out, `${nameSlug}${theme === "dark" ? "-night" : ""}-${format}.svg`);
    if (!existsSync(from)) throw new Error(`Cover generator did not write ${from}`);
    renameSync(from, join(coverDir, `${theme}-${format}.svg`));
  }
  rmSync(out, { recursive: true, force: true });
}

/* ---------------- summary ---------------- */

const count = (table: string) => (sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
console.log(`Seeded ${EVENT.name} into ${DB_PATH}`);
console.log(
  `  ${count("sessions")} sessions, ${count("tracks")} tracks, ${count("venues")} rooms, ${count("speakers")} speakers`,
);
console.log(
  `  ${count("memberships") - 1} participants (${PEOPLE.length} with profiles), ${count("saved_sessions")} saves, ${count("interactions")} interactions`,
);
console.log(`  ${count("connections")} connections, ${count("messages")} messages, ${count("notifications")} notifications`);
console.log(`  Demo clock: Sat, May 15, 11:20 Astana time. Cover: public/covers/${EVENT.slug}/`);
sqlite.close();
