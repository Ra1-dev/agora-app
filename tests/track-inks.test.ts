import { describe, expect, it } from "vitest";
import { assignTrackInks, inkQueue, MAX_COLOURED_TRACKS } from "@/lib/brand/track-inks";
import { DEFAULT_ACCENT_LIGHT, TRACK_ORDER } from "@/lib/brand/tokens";

const tracks = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `t${i + 1}`, position: i + 1 }));

describe("track inks", () => {
  it("reads the order from the tokens file", () => {
    expect(TRACK_ORDER).toEqual(["blue", "green", "yellow", "teal", "pink", "orange", "burgundy", "purple"]);
  });

  it("moves blue and purple last with AGORA's default blue accent (S14)", () => {
    expect(DEFAULT_ACCENT_LIGHT).toBe("#3255A4");
    expect(inkQueue(DEFAULT_ACCENT_LIGHT)).toEqual([
      "green", "yellow", "teal", "pink", "orange", "burgundy", "blue", "purple",
    ]);
  });

  it("keeps the original order when nothing clashes (STEPPE violet #5B3DF5)", () => {
    expect(inkQueue("#5B3DF5")).toEqual([...TRACK_ORDER]);
  });

  it("moves a clashing ink to the end for a pink organizer", () => {
    const q = inkQueue("#FF48B0");
    expect(q.at(-1)).toBe("pink");
    expect(q.slice(0, 4)).toEqual(["blue", "green", "yellow", "teal"]);
  });

  it("assigns the six STEPPE tracks in position order, ignoring input order", () => {
    const six = tracks(6).reverse();
    const map = assignTrackInks(six, "#5B3DF5");
    expect([1, 2, 3, 4, 5, 6].map((i) => map.get(`t${i}`)?.ink)).toEqual([
      "blue", "green", "yellow", "teal", "pink", "orange",
    ]);
    expect([...map.values()].every((a) => !a.secondRun)).toBe(true);
  });

  it("starts a second run at track 9 and stops colouring after 16", () => {
    const map = assignTrackInks(tracks(18), DEFAULT_ACCENT_LIGHT);
    expect(map.get("t8")).toEqual({ ink: "purple", secondRun: false });
    expect(map.get("t9")).toEqual({ ink: "green", secondRun: true });
    expect(map.get("t16")).toEqual({ ink: "purple", secondRun: true });
    expect(MAX_COLOURED_TRACKS).toBe(16);
    expect(map.get("t17")).toEqual({ ink: null, secondRun: false });
    expect(map.get("t18")).toEqual({ ink: null, secondRun: false });
  });

  it("never gives two first-run tracks the same ink", () => {
    const map = assignTrackInks(tracks(8), "#00A95C");
    expect(new Set([...map.values()].map((a) => a.ink)).size).toBe(8);
  });
});
