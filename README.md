# AGΩRA

**Know where to be. Know who to meet.**

AGORA is a companion app for events, conferences and professional gatherings. Participants browse the program, save sessions, get picks that explain themselves, spot overlaps and connect with people who share their interests. Organizers update sessions, send announcements and see how the event is going.

This repository is the local demo built for the NU senior project "AI-Powered Platform for Events, Conferences and Professional Gatherings" (Team 37).

## Status

In progress. Done so far: project scaffold, the pure logic with tests, and the database with seed data. Screens come next.

- `docs/` — project documents, demo scope and design decisions
- `design/` — design tokens, logos, icons and the cover generator
- `src/lib/` — pure logic: brand colours and track inks, overlaps, event time zone, picks (TF-IDF), people suggestions
- `src/db/` and `drizzle/` — schema (Drizzle + SQLite) and migrations
- `scripts/seed/` — the fictional STEPPE AI Summit 2027 (May 14–16, Astana): 41 sessions, 6 tracks, 5 rooms, 15 speakers, 30 participants with profiles and 410 lightweight attendees
- `tests/` — Vitest (`npm test`)

The demo runs on a clock that starts on Saturday, May 15, 11:20 Astana time, when you seed, and moves in real time. All people and organizations in the seed are invented.

## Quickstart

Coming with the first version of the app. The target is:

```
npm install
npm run db:seed
npm run dev
```

Then open http://localhost:3000. No account is needed: use "Viewing as" to switch between a participant and the organizer.
