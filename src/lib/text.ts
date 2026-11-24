// Copy helpers shared by explanations and notifications.

/** "Edge AI", "Edge AI and Privacy", "Edge AI, Privacy and Accessibility". */
export function joinList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** "1 talk", "2 talks". */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}
