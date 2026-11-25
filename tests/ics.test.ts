import { describe, expect, it } from "vitest";
import { sessionIcs } from "@/lib/ics";
import { zonedTimeToUtc } from "@/lib/time";

describe("Add to calendar (.ics)", () => {
  const ics = sessionIcs({
    uid: "se_small_models@steppe-ai-2027.agora.local",
    title: "Small models on the edge · STEPPE AI Summit 2027",
    description: "Edge AI, without a data center; measured in milliwatts.",
    location: "Hall B, Esil Congress Center, Astana",
    startsAt: zonedTimeToUtc("2027-05-15", "11:30", "Asia/Almaty"),
    endsAt: zonedTimeToUtc("2027-05-15", "12:15", "Asia/Almaty"),
    createdAt: zonedTimeToUtc("2027-05-15", "11:20", "Asia/Almaty"),
  });

  it("writes UTC times so calendars convert them correctly", () => {
    expect(ics).toContain("DTSTART:20270515T063000Z");
    expect(ics).toContain("DTEND:20270515T071500Z");
  });

  it("escapes commas and semicolons and uses CRLF line endings", () => {
    expect(ics).toContain("DESCRIPTION:Edge AI\\, without a data center\\; measured in milliwatts.");
    expect(ics).toContain("LOCATION:Hall B\\, Esil Congress Center\\, Astana");
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});
