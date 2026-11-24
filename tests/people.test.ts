import { describe, expect, it } from "vitest";
import { suggestPeople } from "@/lib/people/suggest";
import { privacySummary, visibleProfile, type Profile, type Visibility } from "@/lib/people/visibility";
import { joinList } from "@/lib/text";

const open: Visibility = { organization: true, title: true, interests: true, bio: false, skills: true };

function person(id: string, name: string, interests: string[], p: Partial<Profile> = {}): Profile {
  return {
    userId: id,
    name,
    organization: "Steppe Labs",
    title: "ML engineer",
    bio: "Builds things.",
    skills: ["Python"],
    interests,
    networkingOptIn: true,
    visibility: open,
    ...p,
  };
}

const dana = ["Edge AI", "Accessibility", "Privacy"];
const people = [
  person("aruzhan", "Aruzhan K.", ["Edge AI", "Robotics"]),
  person("madina", "Madina O.", ["accessibility", "Privacy", "Design"]),
  person("ruslan", "Ruslan B.", ["Edge AI"], { networkingOptIn: false }),
  person("hidden", "Hidden H.", ["Edge AI", "Privacy"], { visibility: { ...open, interests: false } }),
  person("timur", "Timur S.", ["Security"]),
  person("dana", "Dana S.", dana),
];

describe("suggestPeople (FR-16, DR-05)", () => {
  it("ranks by shared visible interests and explains with them", () => {
    const s = suggestPeople({ viewerId: "dana", viewerInterests: dana, candidates: people });
    expect(s.map((x) => x.userId)).toEqual(["madina", "aruzhan"]);
    expect(s[0]?.reason).toBe("You both follow Accessibility and Privacy.");
    expect(s[1]?.reason).toBe("You both follow Edge AI.");
  });

  it("never suggests people with networking off or hidden interests", () => {
    const ids = suggestPeople({ viewerId: "dana", viewerInterests: dana, candidates: people }).map((x) => x.userId);
    expect(ids).not.toContain("ruslan");
    expect(ids).not.toContain("hidden");
    expect(ids).not.toContain("dana");
    expect(ids).not.toContain("timur");
  });

  it("skips people already connected or requested", () => {
    const s = suggestPeople({ viewerId: "dana", viewerInterests: dana, candidates: people, excludeIds: new Set(["madina"]) });
    expect(s.map((x) => x.userId)).toEqual(["aruzhan"]);
  });

  it("suggests no one when the viewer declared no interests", () => {
    expect(suggestPeople({ viewerId: "dana", viewerInterests: [], candidates: people })).toEqual([]);
  });
});

describe("visibility (FR-09)", () => {
  it("shows only opened fields to others and everything to the owner", () => {
    const madina = people[1]!;
    const seen = visibleProfile(madina, "dana");
    expect(seen.organization).toBe("Steppe Labs");
    expect(seen.bio).toBeUndefined();
    expect(visibleProfile(madina, "madina").bio).toBe("Builds things.");
    const closed = visibleProfile(people[3]!, "dana");
    expect(closed.interests).toBeUndefined();
    expect(closed.name).toBe("Hidden H.");
  });

  it("describes privacy in plain words", () => {
    expect(privacySummary({ organization: true, title: false, interests: true, bio: false, skills: false })).toBe(
      "Others see your name, organization and interests. Your role, bio and skills are hidden. Change this in Profile.",
    );
    expect(privacySummary({ organization: true, title: true, interests: true, bio: false, skills: true })).toBe(
      "Others see your name, organization, role, interests and skills. Your bio is hidden. Change this in Profile.",
    );
  });

  it("joins lists in US English", () => {
    expect(joinList([])).toBe("");
    expect(joinList(["A"])).toBe("A");
    expect(joinList(["A", "B", "C"])).toBe("A, B and C");
  });
});
