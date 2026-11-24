// Copy helpers shared by explanations and notifications.

/** "Edge AI", "Edge AI and Privacy", "Edge AI, Privacy and Accessibility". */
export function joinList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** "Aruzhan Kassymova" → "Aruzhan K." (how people appear in lists, S12). */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? "";
  return `${parts[0]} ${parts[parts.length - 1]![0]}.`;
}

/** "Aruzhan Kassymova" → "AK" for avatars. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase();
}

/** Cuts long text at a word boundary: "Are you staying for…". */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  // Cut already ends at a word boundary: keep the whole last word.
  if (/\s/.test(text.charAt(max - 1))) return `${cut.trimEnd()}…`;
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** "1 talk", "2 talks". */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}
