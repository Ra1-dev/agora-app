// Minimal iCalendar (RFC 5545) for "Add to calendar". Times in UTC, so any calendar app shows them right.

const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Escapes text values and folds nothing longer than needed for this small file. */
function text(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
}

export function sessionIcs(input: {
  uid: string;
  title: string;
  description: string;
  location: string;
  startsAt: number;
  endsAt: number;
  createdAt: number;
  url?: string;
}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AGORA demo//Event companion//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${input.uid}`,
    `DTSTAMP:${stamp(input.createdAt)}`,
    `DTSTART:${stamp(input.startsAt)}`,
    `DTEND:${stamp(input.endsAt)}`,
    `SUMMARY:${text(input.title)}`,
    `LOCATION:${text(input.location)}`,
    `DESCRIPTION:${text(input.description)}`,
    ...(input.url ? [`URL:${input.url}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.join("\r\n")}\r\n`;
}
