# Design decisions that affect code

The brand and UI were designed and approved before any code (Nov 2026). This file lists the decisions that change data models, logic or copy — not just looks. The visual source of truth is the brandbook; the numbered sheets hold the detail and the reasoning.

- Brandbook (Design System, agent-readable README): https://claude.ai/artifact/DDQbjT3raVLwZxSfGEg6ZF
- Sheets are referenced below as **[S05]** etc.; links are in `design/README.md`.
- Tokens: `design/tokens/agora.css` (CSS variables `--ag-*`) and `design/tokens/agora.tokens.json` (W3C Design Tokens).

## 1. We are guests: frame and fill [S15]

The event belongs to the organizer. AGORA keeps the **frame**; the organizer provides the **fill**.

- **Frame (never changes per event):** grid and spacing, components and their behaviour, the programme row, track inks, status colours (error, success, warning), Source Sans 3 for all text, times and numbers, icons, system copy in AGORA's voice.
- **Fill (per event):** logo, action colour, cover image, default theme (light/dark), display font for the event name and screen headings, the organizer's own copy (announcements, track names).
- **AGORA is visible only** in the app shell: "My events" list, splash, app icon, and "Powered by AGΩRA" in the event's About page, emails and print. Inside event screens the header shows the organizer's logo and event name, not AGORA.

### Presence levels (set by what the organizer uploaded — no setting)

| Level | Organizer gave | Result |
| --- | --- | --- |
| 1 Signature | logo + one colour | action colour + **generated cover** (see §7) in organizer colour + pink; event name in Forum |
| 2 Cover | + cover image, optional font | their cover on the event home; their font in the event name; their default theme |
| 3 Host | + brand background tint, font | screen background tint, their font in screen headings, header/tab bar in their colours |

Data model consequence — `Event` needs: `logoUrl`, `logoDarkUrl?`, `markUrl?`, `brandColor`, `coverUrl?`, `defaultTheme ('light'|'dark')`, `displayFont?`, `bgTintLight?`, `bgTintDark?`. In CSS the event overrides only `--ag-color-accent`, `--ag-color-on-accent` and the `--ag-event-*` variables (`--ag-event-bg`, `--ag-event-bar`, `--ag-event-name-font`, `--ag-event-heading-font`, `--ag-event-cover`).

**Demo:** one event at level 1 is enough; keep the fields in the model.

### Deriving the action colour from the organizer colour [S07]

- Light theme: darken the organizer colour toward black until contrast with `#FFFFFF` ≥ 4.5:1. Dark theme: lighten toward white until contrast with `#1B1A18` ≥ 4.5:1.
- Text on it (`on-accent`): white or `#111110`, whichever has higher contrast.
- **Monochrome organizer** (HSV saturation < 0.12): accent = `ink` (`#151618` day / `#F0EDE6` night), links underlined.
- Red-ish organizer colour: allowed on buttons, but errors always carry an icon + text and "Live now" a dot + word, so they are never told apart by colour alone.
- The organizer's logo is never recoloured; AGORA's logo never takes the organizer colour.

## 2. Track colours [S14]

Tracks get risograph inks **in this order**: blue, green, yellow, teal, pink, orange, burgundy, purple (`--ag-color-track-*`). The order maximises distinction under deuteranopia/protanopia.

- Any ink within **ΔE76 < 30** of the event's action colour moves to the end of the queue. With AGORA's default blue accent this moves blue and purple last, so the effective default order is green, yellow, teal, pink, orange, burgundy, blue, purple.
- Tracks 9–16: same order again as a **"second run"** — ring dot (`--ag-track-ring`) and dashed stripe (`--ag-track-dash`). More than 16: colour by organizer stream, not by track.
- In light theme, yellow and orange dots get a 1px edge (`--ag-track-edge`).
- The track **name is always shown next to the colour**. Track colour is never used for text.

Implement as a pure function `assignTrackInks(tracks, accentHex) → Map<trackId, {ink, secondRun}>` and unit-test it.

## 3. Session states [S12]

One component, **the programme row** (time column on the left, hairline-separated rows, no card boxes), used everywhere: Program, My schedule, picks and search. States:

| State | Shown as |
| --- | --- |
| default | time / room + track dot / title / speaker / **Save** |
| picked for you | "Picked for you" chip (accent) + one-line reason in accent: "Because you follow Edge AI." |
| saved | **Saved** button with a green check |
| overlaps | row hatched in warning colour + "Overlaps with <title>." + **Resolve** |
| live now | red "Live now" chip with dot; "Ends at 11:15." |
| rescheduled | old start time struck through + "Rescheduled" + "Now 14:00 (was 11:30). Still in Hall B." |
| room change | "Room change" + "Moved to Hall C. Same time, 15:00." |
| canceled | title struck through, "Canceled by the organizer.", **Can't save** (disabled) |

- Overlap rule (requirements DR): intervals overlap if `a.start < b.end && b.start < a.end`; back-to-back is not an overlap. Resolve = bottom sheet "Keep which session?" with the two sessions → keep one (removes the other from the schedule) or "Decide later".
- Saving never reserves a seat. A canceled session cannot be saved; if it was saved before, it stays in My schedule marked canceled.
- Times are shown in the **event's time zone**; label the zone when it differs from the device ("11:30 Astana time"). 24-hour format by default.

## 4. Voice and copy [S10]

- UI language: **US English** (organizer, program, canceled). Sentence case. Buttons are verb + object ("Send request", "Keep this one").
- Notifications: say **what changed and what to do**. Event name first in push titles; AGORA says "we" only for its own errors.
- Recommendations always **explain themselves** using only what the user declared: "Because you follow Edge AI and saved 2 talks by this speaker."
- Privacy in plain words: "Others see your name, organization and interests. Change this in Profile." Never "We noticed you viewed…".
- Use names, not he/she: "You can message once Aruzhan accepts."
- Banned words: AI-powered, smart, seamless, magic, unlock, supercharge, journey, delightful, Oops. No emoji in system text. At most one exclamation mark, only for celebrations.
- Vocabulary: **Save** (not bookmark/like), **My schedule** (personal), **Program** (event-wide), **Picked for you**, **Overlaps**, **People**, **Connect / connection request**, **Announcement**, **Check in**, **Session**, **Organizer**.

### Rewritten messages from the requirements

| Where | Use |
| --- | --- |
| UC-03 no sessions | "Nothing to suggest yet. Picks appear once the organizer publishes the program." |
| UC-03 no interests | List label: "Popular across tracks. Add your interests to get picks made for you." |
| UC-01 bad email | "Enter an email like name@example.com." |
| UC-02 saved session canceled | "Canceled: Small models on the edge, Tue 11:30. It stays in My schedule, marked as canceled." |
| UC-02 save canceled session | "Canceled by the organizer. It can't be added to your schedule." |
| UC-02 duplicate save | no message; the button just shows **Saved** |
| UC-04 pending request | "You can message once Aruzhan accepts your request." |
| UC-05 rescheduled | "Rescheduled: Privacy by design now starts at 14:00 (was 11:30). Still in Hall B." |
| UC-05 room change | "Room change: Small models on the edge is now in Hall C. Same time, 11:30." |
| UC-06 empty period | "No activity between 9:00 and 10:00. Try a wider range." |
| UC-06 freshness | "Updated 2 min ago" |
| UC-06 other event | "Only this event's organizers can see its stats." |
| offline | "You're offline. We'll show what you missed when you reconnect." |
| load error | "We couldn't load the program. Pull to retry." |

## 5. Visual system in code [S11, S12, S13]

- Fonts (Google Fonts): **Forum** (voice: event name, screen titles, big numbers; ≥ 24px only, never bold) and **Source Sans 3** (everything else). Times and counters use tabular numerals; room/track labels use `font-variant-caps: all-small-caps` + 0.07em tracking. IBM Plex Mono only for event codes.
- Corners "soft print": controls 2px, cards 4px, sheets 8px, avatars and track dots round.
- Depth "lines": cards are separated by a 1px `line` border, no shadow. `shadow-float` only for menus, bottom sheet, toast.
- Spacing step 4px (`--ag-space-N` = N×4). Phone gutter 16px. Breakpoints 600 / 1024 / 1440.
- Minimum tap target 44px.
- Icons: `design/icons/*.svg` (24 grid, 1.75 stroke, square caps, round joins, `currentColor`). Use inline SVG or the sprite `agora-icons.svg` (`<use href="#ag-search">`). In nav and buttons always with a text label. No sparkles for "AI", no icon instead of the word "Save".
- Light theme "Paros" is default; dark theme "Night". Both are in `agora.css` (`data-theme="dark"` or system preference).

## 6. Motion [S17]

Durations `--ag-duration-fast` 120ms, `base` 200, `slow` 320, `ceremony` 600; easings `--ag-ease-standard`, `exit`, `stamp`. Only opacity and slides ≤ 24px; exit is faster than enter. Only "Live now" (1.6s) and loading skeletons (1.4s) loop. Respect `prefers-reduced-motion` (already handled in `agora.css`). Room change on a saved session: old room fades out, new one slides in underlined, the row flashes once.

## 7. Default cover generator [S16]

An event without its own cover gets a generated one: a marble shard, two risograph shapes, grain and the event name in Forum. Same name → same cover (seeded). `design/agora-cover.mjs` produces SVG for 3:1, 1:1 and 9:16:

```
node design/agora-cover.mjs "STEPPE AI Summit 2027" --meta "May 14–16, Astana" --ink org --org "#5B3DF5" --out public/covers
```

The program UI itself (rows, search, profile, organizer desk) never uses marble, inks or grain.

## 8. App structure

- **My events** — the only AGORA-owned list: event mark, name, dates, "Live now". Join with an event code.
- **Event tabs (participant):** Program, My schedule, People, Inbox.
- **Personal "album" layer** (My schedule, People, Recap) may use paper tickets, tape and an Ω "SAVED" stamp in the accent colour — friend voice. Optional for the demo; the official layer is the programme-row UI.
- **Organizer desk** (web): top nav with the plain AGORA logo on the left and the event selector on the right — Overview (stats + "Updated N min ago"), Sessions (edit time/room/cancel), Announcements (compose + "Reached 212 of 240 people who saved this session"), People. Aggregates only; never message contents.
