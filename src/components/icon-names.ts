// Names of the symbols in design/icons/agora-icons.svg (each is `ag-<name>`).
// tests/icons.test.ts checks this list against the sprite and the single-icon files.
export const ICON_NAMES = [
  "add", "alert", "analytics", "announcement", "attendees", "back", "break", "calendar-add",
  "canceled", "check-in", "check", "chevron-down", "chevron-right", "close", "connect", "connected",
  "copy", "dashboard", "delete", "download", "edit", "external", "filter", "hidden", "inbox", "info",
  "language", "link", "live", "location", "map", "materials", "menu", "message", "more",
  "notification", "offline", "overlap", "people", "private", "profile", "program", "refresh",
  "requested", "rescheduled", "room", "schedule", "search", "send", "settings", "share", "sign-out",
  "sort", "speaker", "time", "track", "visible",
] as const;

export type IconName = (typeof ICON_NAMES)[number];
