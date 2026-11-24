// AGORA demo schema. Kept close to the kickoff entities (Event, Session, Track, Venue, Speaker,
// User/Profile, Interest, Membership, Interaction, SavedSession, Connection, Message, Notification)
// so it can move to PostgreSQL later. Every event-scoped record carries eventId.
// Instants are epoch milliseconds (UTC); dates are "YYYY-MM-DD" in the event's time zone.
import { relations, sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const ms = (name: string) => integer(name, { mode: "number" });
const bool = (name: string) => integer(name, { mode: "boolean" });

/* ---------------- event and program ---------------- */

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  /** Event code people type to join (IBM Plex Mono in the UI). */
  code: text("code").notNull().unique(),
  startsOn: text("starts_on").notNull(),
  endsOn: text("ends_on").notNull(),
  timeZone: text("time_zone").notNull(),
  city: text("city").notNull(),
  venueName: text("venue_name").notNull(),
  about: text("about").notNull().default(""),
  organizerName: text("organizer_name").notNull(),
  // Organizer "fill" (design-decisions §1). Level 1 uses brandColor + logo and a generated cover.
  brandColor: text("brand_color").notNull(),
  logoUrl: text("logo_url").notNull(),
  logoDarkUrl: text("logo_dark_url"),
  markUrl: text("mark_url"),
  coverUrl: text("cover_url"),
  defaultTheme: text("default_theme", { enum: ["light", "dark"] }).notNull().default("light"),
  displayFont: text("display_font"),
  bgTintLight: text("bg_tint_light"),
  bgTintDark: text("bg_tint_dark"),
  publishedAt: ms("published_at"),
});

export const tracks = sqliteTable(
  "tracks",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    position: integer("position").notNull(),
  },
  (t) => [index("tracks_event_idx").on(t.eventId, t.position)],
);

/** Rooms ("venues" in the kickoff). */
export const venues = sqliteTable(
  "venues",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    floor: text("floor").notNull().default(""),
    capacity: integer("capacity").notNull().default(0),
    position: integer("position").notNull(),
  },
  (t) => [index("venues_event_idx").on(t.eventId, t.position)],
);

export const speakers = sqliteTable(
  "speakers",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    organization: text("organization").notNull().default(""),
    title: text("title").notNull().default(""),
    bio: text("bio").notNull().default(""),
    /** Topic tags, used by recommendations and search. */
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  },
  (t) => [index("speakers_event_idx").on(t.eventId)],
);

export const SESSION_FORMATS = ["keynote", "talk", "panel", "workshop"] as const;
export const SESSION_CHANGES = ["rescheduled", "room_change"] as const;

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    trackId: text("track_id").notNull().references(() => tracks.id),
    venueId: text("venue_id").notNull().references(() => venues.id),
    title: text("title").notNull(),
    abstract: text("abstract").notNull().default(""),
    format: text("format", { enum: SESSION_FORMATS }).notNull().default("talk"),
    startsAt: ms("starts_at").notNull(),
    endsAt: ms("ends_at").notNull(),
    status: text("status", { enum: ["scheduled", "canceled"] }).notNull().default("scheduled"),
    materialsUrl: text("materials_url"),
    // Last organizer change, for the "rescheduled" / "room change" row states.
    changeKind: text("change_kind", { enum: SESSION_CHANGES }),
    prevStartsAt: ms("prev_starts_at"),
    prevEndsAt: ms("prev_ends_at"),
    prevVenueId: text("prev_venue_id").references(() => venues.id),
    changedAt: ms("changed_at"),
    canceledAt: ms("canceled_at"),
    createdAt: ms("created_at").notNull(),
    updatedAt: ms("updated_at").notNull(),
  },
  (t) => [index("sessions_event_start_idx").on(t.eventId, t.startsAt), index("sessions_track_idx").on(t.trackId)],
);

export const sessionSpeakers = sqliteTable(
  "session_speakers",
  {
    sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
    speakerId: text("speaker_id").notNull().references(() => speakers.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.speakerId] }), index("session_speakers_speaker_idx").on(t.speakerId)],
);

/* ---------------- people ---------------- */

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  /** Fictional address on example.com; no sign-in in the demo. */
  email: text("email").notNull().unique(),
  createdAt: ms("created_at").notNull(),
});

export const profiles = sqliteTable("profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  organization: text("organization"),
  title: text("title"),
  bio: text("bio"),
  skills: text("skills", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  networkingOptIn: bool("networking_opt_in").notNull().default(false),
  // Per-field visibility (FR-09). The name is always visible.
  showOrganization: bool("show_organization").notNull().default(true),
  showTitle: bool("show_title").notNull().default(true),
  showInterests: bool("show_interests").notNull().default(true),
  showBio: bool("show_bio").notNull().default(false),
  showSkills: bool("show_skills").notNull().default(false),
  updatedAt: ms("updated_at").notNull(),
});

export const interests = sqliteTable("interests", {
  id: text("id").primaryKey(),
  label: text("label").notNull().unique(),
});

export const userInterests = sqliteTable(
  "user_interests",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    interestId: text("interest_id").notNull().references(() => interests.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.interestId] }), index("user_interests_interest_idx").on(t.interestId)],
);

export const memberships = sqliteTable(
  "memberships",
  {
    eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["participant", "organizer"] }).notNull(),
    registeredAt: ms("registered_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.userId] }), index("memberships_user_idx").on(t.userId)],
);

/* ---------------- agenda and interactions ---------------- */

export const savedSessions = sqliteTable(
  "saved_sessions",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
    eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    savedAt: ms("saved_at").notNull(),
  },
  // One row per user and session: saving twice never creates a duplicate (UC-02).
  (t) => [primaryKey({ columns: [t.userId, t.sessionId] }), index("saved_sessions_session_idx").on(t.sessionId)],
);

export const INTERACTION_KINDS = ["view", "save", "check_in"] as const;

/** Views, saves and check-ins recorded separately (FR-19, DR-04). */
export const interactions = sqliteTable(
  "interactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    sessionId: text("session_id").references(() => sessions.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: INTERACTION_KINDS }).notNull(),
    createdAt: ms("created_at").notNull(),
  },
  (t) => [
    index("interactions_event_kind_idx").on(t.eventId, t.kind, t.createdAt),
    index("interactions_session_idx").on(t.sessionId, t.kind),
    index("interactions_user_idx").on(t.userId, t.kind),
  ],
);

/* ---------------- networking ---------------- */

export const connections = sqliteTable(
  "connections",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    requesterId: text("requester_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    recipientId: text("recipient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["pending", "accepted", "declined"] }).notNull(),
    createdAt: ms("created_at").notNull(),
    respondedAt: ms("responded_at"),
  },
  (t) => [
    uniqueIndex("connections_pair_idx").on(t.eventId, t.requesterId, t.recipientId),
    index("connections_recipient_idx").on(t.recipientId, t.status),
  ],
);

/** Private: never read by organizer stats (DR-06). */
export const messages = sqliteTable(
  "messages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    connectionId: text("connection_id").notNull().references(() => connections.id, { onDelete: "cascade" }),
    senderId: text("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: ms("created_at").notNull(),
  },
  (t) => [index("messages_connection_idx").on(t.connectionId, t.createdAt)],
);

/* ---------------- announcements and notifications ---------------- */

export const announcements = sqliteTable(
  "announcements",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    authorId: text("author_id").notNull().references(() => users.id),
    body: text("body").notNull(),
    audience: text("audience", { enum: ["everyone"] }).notNull().default("everyone"),
    publishedAt: ms("published_at").notNull(),
    recipientCount: integer("recipient_count").notNull().default(0),
  },
  (t) => [index("announcements_event_idx").on(t.eventId, t.publishedAt)],
);

export const NOTIFICATION_KINDS = [
  "room_change",
  "rescheduled",
  "canceled",
  "connection_request",
  "connection_accepted",
  "message",
  "announcement",
  "starts_soon",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/**
 * Stored before live delivery so a client that was away gets what it missed (FR-21).
 * The autoincrement id doubles as the SSE event id (Last-Event-ID).
 */
export const notifications = sqliteTable(
  "notifications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: NOTIFICATION_KINDS }).notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    sessionId: text("session_id").references(() => sessions.id, { onDelete: "cascade" }),
    connectionId: text("connection_id").references(() => connections.id, { onDelete: "cascade" }),
    announcementId: text("announcement_id").references(() => announcements.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    /** Prevents duplicates, e.g. one "starts in 10 min" per user and session. */
    dedupeKey: text("dedupe_key").unique(),
    createdAt: ms("created_at").notNull(),
    deliveredAt: ms("delivered_at"),
    readAt: ms("read_at"),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId, t.eventId, t.id),
    index("notifications_announcement_idx").on(t.announcementId),
  ],
);

/** Small key/value store for demo settings (the demo clock). */
export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

/* ---------------- relations (for db.query) ---------------- */

export const eventsRelations = relations(events, ({ many }) => ({
  tracks: many(tracks),
  venues: many(venues),
  sessions: many(sessions),
  speakers: many(speakers),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  event: one(events, { fields: [sessions.eventId], references: [events.id] }),
  track: one(tracks, { fields: [sessions.trackId], references: [tracks.id] }),
  venue: one(venues, { fields: [sessions.venueId], references: [venues.id] }),
  prevVenue: one(venues, { fields: [sessions.prevVenueId], references: [venues.id] }),
  speakers: many(sessionSpeakers),
}));

export const sessionSpeakersRelations = relations(sessionSpeakers, ({ one }) => ({
  session: one(sessions, { fields: [sessionSpeakers.sessionId], references: [sessions.id] }),
  speaker: one(speakers, { fields: [sessionSpeakers.speakerId], references: [speakers.id] }),
}));

export const tracksRelations = relations(tracks, ({ one, many }) => ({
  event: one(events, { fields: [tracks.eventId], references: [events.id] }),
  sessions: many(sessions),
}));

export const venuesRelations = relations(venues, ({ one }) => ({
  event: one(events, { fields: [venues.eventId], references: [events.id] }),
}));

export const speakersRelations = relations(speakers, ({ many }) => ({
  sessions: many(sessionSpeakers),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, { fields: [users.id], references: [profiles.userId] }),
  interests: many(userInterests),
  memberships: many(memberships),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
}));

export const userInterestsRelations = relations(userInterests, ({ one }) => ({
  user: one(users, { fields: [userInterests.userId], references: [users.id] }),
  interest: one(interests, { fields: [userInterests.interestId], references: [interests.id] }),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, { fields: [memberships.userId], references: [users.id] }),
  event: one(events, { fields: [memberships.eventId], references: [events.id] }),
}));

export const connectionsRelations = relations(connections, ({ one, many }) => ({
  requester: one(users, { fields: [connections.requesterId], references: [users.id] }),
  recipient: one(users, { fields: [connections.recipientId], references: [users.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  connection: one(connections, { fields: [messages.connectionId], references: [connections.id] }),
}));
