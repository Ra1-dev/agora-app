# Demo scope

Goal: show the core functionality and the approved design, running locally. Not production: no auth, no deployment, no mobile app.

## Decisions

- **Web only**, fully responsive down to phone width (participant screens are designed phone-first; the organizer desk is desktop-first but must not break on a phone).
- **Stack:** TypeScript end to end. Next.js (App Router) for UI and API routes in one project. SQLite file for data (schema written so it can move to PostgreSQL later). One command to install, one to seed, one to run.
- **No auth.** A "Viewing as" switcher in the header: participant **Dana Seitkali** (default), two more participants, and **Organizer**. Store the choice in a cookie/localStorage. Server checks still go through a `currentUser` helper so real auth can replace it later.
- **Recommendations:** rule-based, per the kickoff: TF-IDF over session title, abstract, track label and speaker tags; cosine similarity to the participant's declared interests; small popularity prior; filter out saved, canceled and past sessions; no interests → track-balanced popular list (UC-03). The explanation names the matched interest(s) and, if relevant, saved talks by the same speaker. No external APIs or keys.
- **People suggestions:** participants who opted into networking, ranked by shared **visible** interests only; the reason lists those shared interests (FR: visibility settings apply to matches).
- **Live updates:** when the organizer changes a session, affected participants see it without reloading (Server-Sent Events from the Next.js server is enough). Notifications are stored, so a tab opened later shows what it missed (FR: retrieve missed notifications).
- **Language:** US English UI, English code and comments.

## Seed data (fictional)

One event, **STEPPE AI Summit 2027**, May 14–16, Astana (time zone Asia/Almaty), organizer colour `#5B3DF5`, presence level 1 (generated cover).

- 3 days, ~40 sessions, 4–5 rooms (Hall A, Hall B, Hall C, Room 3, Room 4), with real parallel overlaps.
- 6 tracks: AI, Security, HCI, Robotics, Data, Design.
- ~15 speakers with topic tags; ~30 participants with organizations, interests, visibility settings, some with networking off.
- Dana has interests (Edge AI, Accessibility, Privacy), a few saved sessions including one overlap, one pending and one accepted connection with a short message thread.
- Use invented names and organizations only; no real companies or people.

## Participant (phone-first)

1. **My events** — the event card ("Live now" if current), "Join with an event code" (any code works in the demo).
2. **Event home** — organizer logo in the header, cover, latest announcement, "Up next" from My schedule, "Open my schedule".
3. **Program** — day tabs, search (sessions, speakers, topics), track filter chips, sort by time or relevance (FR); programme rows with states; "Picked for you" section at the top with reasons.
4. **Session** — title, time (event TZ), room, speaker(s), track, abstract, materials link, Save / Saved, "Why this is picked for you", add to calendar (can be a stub).
5. **My schedule** — saved sessions in time order per day, overlaps marked, Resolve → bottom sheet "Keep which session?" (FR: identify overlaps and resolve by removing one).
6. **People** — suggestions with "You both follow…", Connect → Requested; incoming requests Accept / Decline; Message only after accepted (UC-04); a simple conversation view.
7. **Inbox** — notifications: room change, rescheduled, canceled, connection request, message, announcement, starts in 10 min; unread dots; badge on the tab.
8. **Profile** — organization, interests, bio, networking on/off, per-field visibility; changes affect picks and People immediately.

## Organizer desk (desktop-first)

1. **Overview** — stats tiles (registrations, saves, check-ins, connections), filters by day / track / session, a sessions table with saves and check-ins, "Updated N min ago" (UC-06; aggregates only).
2. **Sessions** — list; edit time and room with validation (start before end, inside event dates); cancel; on save, affected participants get a notification and their schedule updates live (UC-05).
3. **Announcements** — compose and publish to everyone; show how many people it reached.
4. **Tracks / rooms** — read-only list is enough.

## Out of scope for the demo

Auth and accounts, multiple events per installation (keep `eventId` on records anyway), admin role, polls/ratings/Q&A, check-in scanning (seed check-ins instead), emails, push, the event kit (slides, signs), deployment, Redis, mobile app, the scrapbook album styling (optional extra if time allows).

## Done means

- `npm install`, `npm run db:seed`, `npm run dev` works on a clean machine (Windows included).
- All participant screens and the organizer desk work at 375px and 1280px wide, light and dark theme.
- The UC-05 flow works across two browser tabs: organizer moves a session to Hall C → participant tab shows the room change in Program, My schedule and Inbox without reload.
- Unit tests for: overlap detection, track ink assignment, accent derivation, recommendation ranking and explanation.
