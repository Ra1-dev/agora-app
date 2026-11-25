# AGΩRA

**Know where to be. Know who to meet.**

AGORA is a companion app for events, conferences and professional gatherings. Participants browse the program, save sessions, get picks that explain themselves, spot overlaps and connect with people who share their interests. Organizers update sessions, send announcements and see how the event is going.

This repository is the local demo built for the NU senior project "AI-Powered Platform for Events, Conferences and Professional Gatherings" (Team 37). It runs on one machine, with no accounts, no external services and no API keys. All people and organizations in the demo data are invented.

## Quickstart

Requirements: Node.js 22 or newer (tested on Node 24, npm 11) on Windows, macOS or Linux. No Visual Studio or build tools are needed.

```
npm install
npm run db:seed
npm run dev
```

Open http://localhost:3000. There is no sign-in: the avatar in the top-right corner opens **Viewing as**, where you pick who you are (Dana, Aruzhan, Ruslan or the organizer), the theme and the demo clock.

`npm run db:seed` builds `data/agora.db` from scratch and can be run again at any time, also while the app is running, to get back to the starting state.

## Demo script (about 5 minutes)

1. **My events** (http://localhost:3000): the only AGORA-owned list. Open STEPPE AI Summit 2027 ("Live now").
2. **Event home**: the organizer's logo and generated cover, the latest announcement, "Up next" from Dana's schedule.
3. **Program**: "Picked for you" with reasons ("Because you follow Edge AI and Privacy, and saved 2 talks by this speaker."), day tabs, track filter, search (try `privacy` or `Aigerim`), sort by relevance or time. The rows show every state: live now, saved, overlaps, rescheduled, canceled.
4. **My schedule**: one overlap. Press **Resolve**, keep one session, then **Undo** from the toast.
5. **People**: requests (accept Madina), connections, suggestions with "You both follow …", sent requests. Open Aruzhan's conversation.
6. **Profile**: change interests or turn off "Show my interests"; Program and People change right away.
7. **Live room change (UC-05)** — two browser tabs:
   - Tab 1: http://localhost:3000/desk/steppe-ai-2027/sessions (organizer desk). Open **Edit** on *Small models on the edge*, pick **Hall C**, **Save and notify**.
   - Tab 2: http://localhost:3000/e/steppe-ai-2027/schedule (Dana). Without reloading, the row moves to Hall C and flashes once, a toast says "Small models on the edge is now in Hall C. Same time, 11:30.", the Inbox badge goes up, and Program and Inbox show the change.
   
   The two tabs can be different people because participant screens and the organizer desk keep separate "Viewing as" choices.
8. **Organizer desk**: Overview (totals with "+N today", filters by day, time, track and session, "Updated N min ago"), Announcements (publish one and watch Dana's tab), Tracks & rooms.
9. **Viewing as → Ruslan**: no interests, networking off. Picks fall back to "Popular across tracks"; People shows how to opt in. **Viewing as → Organizer** from a participant screen opens the desk; choosing a participant on the desk shows "Only this event's organizers can see its stats."

The demo clock starts at **Saturday, May 15, 11:20, Astana time** when you seed and then moves in real time, so "Live now", "Up next" and "Starts in 10 min" have something to show. Move it or reset it in **Viewing as → Demo clock**. Before a presentation, run `npm run db:seed` (or press **Reset to Sat 11:20**).

## What is in the demo

Participant screens (phone-first): My events, Event home, Program, Session (with "Add to calendar"), My schedule with overlap resolution, People, person page, conversation, Inbox, Profile with per-field visibility, About ("Powered by AGΩRA").

Organizer desk (desktop-first, works on a phone): Overview, Sessions (change time and room, cancel), Announcements (with reach), Tracks & rooms.

How the main requirements map to the code:

| Requirement | Where |
| --- | --- |
| Overlaps (FR-13, DR-03): `a.start < b.end && b.start < a.end`, back-to-back is fine | `src/lib/schedule/overlaps.ts` |
| Session time rules (DR-02), event time zone, 24-hour | `src/lib/schedule/validate.ts`, `src/lib/time.ts` |
| Picks (FR-14, FR-15): TF-IDF over title, abstract, track and speaker tags, cosine to declared interests, small popularity prior, reasons; popular across tracks without interests | `src/lib/recs/` |
| People suggestions (FR-16, DR-05) and visibility (FR-09) | `src/lib/people/` |
| Event branding: action color from the organizer color, track inks (S07, S14) | `src/lib/brand/` |
| Programme row states (S12) | `src/lib/schedule/row-state.ts`, `src/components/ProgrammeRow.tsx` |
| Live updates and missed notifications (FR-20, FR-21) | `src/server/live/bus.ts`, `src/app/api/e/[slug]/stream/route.ts`, `src/components/LiveUpdates.tsx` |
| Session changes, cancel, announcements, stats (UC-05, UC-06, FR-06, FR-07, FR-22) | `src/server/organizer.ts` |
| "Who is this" (no sign-in) | `src/lib/auth/current-user.ts` |

## Tests

```
npm test
```

Vitest, 125 tests. Pure logic: overlap detection, track ink assignment, accent derivation from the organizer color, recommendation ranking and explanations, search, time zone and validation, programme row states, notification copy, calendar files. Integration tests run the real migrations on a temporary SQLite file (never `data/agora.db`): saving and resolving, connections and messages, profile, notifications and reminders, organizer changes and stats.

Other scripts: `npm run typecheck`, `npm run build`, `npm run db:generate` (after changing `src/db/schema.ts`).

## Project layout

- `src/app/` — Next.js App Router: `/` (My events), `/e/[slug]/…` (participant screens), `/desk/[slug]/…` (organizer desk), `/api/…` (route handlers)
- `src/components/` — shared UI: programme row, Save toggle, sheets, toasts, chips, live updates
- `src/lib/` — pure logic (no database), covered by unit tests
- `src/server/` — data access and services (SQLite through Drizzle)
- `src/db/` and `drizzle/` — schema and migrations
- `scripts/seed/` — the fictional STEPPE AI Summit 2027: 41 sessions, 6 tracks, 5 rooms, 15 speakers, 30 participants with profiles and 410 lightweight attendees for realistic totals
- `design/` — approved tokens, logos, icons and the cover generator (styles use only the `--ag-*` tokens from `design/tokens/agora.css`)
- `docs/` — project documents, demo scope and design decisions

## Differences from the project documents

The demo keeps the kickoff's data model (events, sessions, tracks, venues, speakers, users and profiles, interests, memberships, interactions, saved sessions, connections, messages, notifications) but simplifies the platform so it runs anywhere with one command:

- Next.js with API route handlers instead of React + FastAPI; SQLite instead of PostgreSQL (every event record carries `eventId`, so moving to PostgreSQL is a schema port).
- Server-Sent Events from the Next.js process instead of WebSocket + Redis. Notifications are stored first, so a tab that reconnects gets what it missed through `Last-Event-ID`.
- No accounts, roles or admin (FR-01, FR-04): "Viewing as" replaces sign-in, and every identity check goes through one helper so real auth can replace it.
- No polls, ratings, Q&A, check-in scanning (check-ins are seeded), emails, push, mobile app or deployment.

`.npmrc` sets `ignore-scripts=true`: better-sqlite3 ships prebuilt binaries in its package, and skipping install scripts stops npm from trying to compile it (which would need Visual Studio on Windows).
