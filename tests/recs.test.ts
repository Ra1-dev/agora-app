import { describe, expect, it } from "vitest";
import {
  EMPTY_MESSAGE,
  explain,
  POPULAR_LABEL,
  recommend,
  type PickCandidate,
} from "@/lib/recs/picks";
import { searchSessions } from "@/lib/recs/search";
import { buildIndex, cosine, textVector } from "@/lib/recs/tfidf";
import { stem, terms } from "@/lib/recs/tokenize";
import { zonedTimeToUtc } from "@/lib/time";

const TZ = "Asia/Almaty";
const at = (day: string, time: string) => zonedTimeToUtc(day, time, TZ);
const NOW = at("2027-05-15", "11:20");

let n = 0;
function session(p: Partial<PickCandidate> & Pick<PickCandidate, "title" | "trackName">): PickCandidate {
  n += 1;
  return {
    id: p.id ?? `s${n}`,
    abstract: "",
    trackId: p.trackName.toLowerCase(),
    speakerTags: [],
    speakerNames: [],
    speakerIds: [],
    startsAt: at("2027-05-15", "14:00"),
    endsAt: at("2027-05-15", "14:45"),
    canceled: false,
    saves: 10,
    ...p,
  };
}

const program: PickCandidate[] = [
  session({
    id: "edge",
    title: "Small models on the edge",
    abstract: "Running language models on phones and sensors: quantization, distillation and battery budgets for edge AI.",
    trackName: "AI",
    speakerTags: ["Edge AI", "TinyML"],
    speakerNames: ["Aigerim Nurlanova"],
    speakerIds: ["sp-aigerim"],
    saves: 40,
  }),
  session({
    id: "privacy",
    title: "Privacy by design",
    abstract: "Data minimisation, consent flows and privacy reviews that ship with the product.",
    trackName: "Security",
    speakerTags: ["Privacy", "Compliance"],
    speakerNames: ["Daniyar Abenov"],
    speakerIds: ["sp-daniyar"],
    saves: 30,
  }),
  session({
    id: "a11y",
    title: "Accessibility audits that stick",
    abstract: "Screen readers, contrast and keyboard paths: making accessibility part of every release.",
    trackName: "HCI",
    speakerTags: ["Accessibility"],
    speakerNames: ["Madina Omarova"],
    speakerIds: ["sp-madina"],
    saves: 12,
  }),
  session({
    id: "robots",
    title: "Robots in the wild",
    abstract: "Field robotics on steppe farms: navigation, dust and long winters.",
    trackName: "Robotics",
    speakerTags: ["Field robotics"],
    speakerNames: ["Timur Sadykov"],
    speakerIds: ["sp-timur"],
    saves: 50,
  }),
  session({
    id: "warehouse",
    title: "Data warehouses for small teams",
    abstract: "Columnar storage and cheap pipelines.",
    trackName: "Data",
    speakerTags: ["Data engineering"],
    speakerNames: ["Aigerim Nurlanova"],
    speakerIds: ["sp-aigerim"],
    saves: 5,
  }),
  session({
    id: "edge-past",
    title: "Edge AI on microcontrollers",
    abstract: "Edge AI with kilobytes of memory.",
    trackName: "AI",
    speakerTags: ["Edge AI"],
    speakerIds: ["sp-aigerim"],
    startsAt: at("2027-05-14", "10:00"),
    endsAt: at("2027-05-14", "10:45"),
    saves: 60,
  }),
  session({
    id: "edge-canceled",
    title: "Edge AI hardware panel",
    abstract: "Edge AI chips compared.",
    trackName: "AI",
    speakerTags: ["Edge AI"],
    canceled: true,
    saves: 70,
  }),
  session({
    id: "type",
    title: "Type on small screens",
    abstract: "Typography and layout for dense schedules.",
    trackName: "Design",
    speakerTags: ["Typography"],
    speakerIds: ["sp-alia"],
    saves: 20,
  }),
];

const index = buildIndex(program);
const run = (interests: string[], saved: string[] = [], extra: Partial<Parameters<typeof recommend>[0]> = {}) =>
  recommend({ sessions: program, index, interests, savedIds: new Set(saved), now: NOW, ...extra });

describe("tokenizer", () => {
  it("lowercases, drops stopwords, stems plurals and adds bigrams", () => {
    const t = terms("Small models on the Edge AI");
    expect([...t.keys()]).toEqual(["small", "small model", "model", "edge", "edge ai", "ai"]);
    expect(stem("studies")).toBe("study");
    expect(stem("glass")).toBe("glass");
    expect(stem("corpus")).toBe("corpus");
  });
});

describe("tf-idf", () => {
  it("scores the matching session highest for a phrase", () => {
    const q = textVector(index, "Edge AI");
    const scores = program.map((s) => [s.id, cosine(index.vectors.get(s.id)!, q)] as const);
    const best = scores.filter(([id]) => !String(id).startsWith("edge-")).sort((a, b) => b[1] - a[1])[0];
    expect(best?.[0]).toBe("edge");
  });

  it("gives unit-length document vectors", () => {
    const v = index.vectors.get("privacy")!;
    expect(cosine(v, v)).toBeCloseTo(1, 6);
  });
});

describe("recommend (FR-14)", () => {
  it("ranks by declared interests and explains each pick", () => {
    const r = run(["Edge AI", "Accessibility", "Privacy"]);
    expect(r.mode).toBe("interests");
    const ids = r.picks.map((p) => p.sessionId);
    expect(ids.slice(0, 3).sort()).toEqual(["a11y", "edge", "privacy"]);
    expect(ids).not.toContain("robots");
    const edge = r.picks.find((p) => p.sessionId === "edge")!;
    expect(edge.reason).toBe("Because you follow Edge AI.");
    expect(r.picks.find((p) => p.sessionId === "a11y")!.reason).toBe("Because you follow Accessibility.");
  });

  it("filters out saved, canceled and already started sessions", () => {
    const r = run(["Edge AI"], ["edge"]);
    const ids = r.picks.map((p) => p.sessionId);
    expect(ids).not.toContain("edge");
    expect(ids).not.toContain("edge-canceled");
    expect(ids).not.toContain("edge-past");
  });

  it("names saved talks by the same speaker", () => {
    const r = run(["Edge AI"], ["edge-past"]);
    const edge = r.picks.find((p) => p.sessionId === "edge")!;
    expect(edge.speakerSaves).toBe(1);
    expect(edge.reason).toBe("Because you follow Edge AI and saved 1 talk by this speaker.");
    // Same speaker, no interest match: still picked, reason names only the saved talk.
    const warehouse = r.picks.find((p) => p.sessionId === "warehouse")!;
    expect(warehouse.reason).toBe("Because you saved 1 talk by this speaker.");
  });

  it("builds explanations from declared data only", () => {
    expect(explain(["Edge AI"], 2)).toBe("Because you follow Edge AI and saved 2 talks by this speaker.");
    expect(explain(["Edge AI", "Privacy"], 0)).toBe("Because you follow Edge AI and Privacy.");
    expect(explain(["Edge AI", "Privacy"], 2)).toBe(
      "Because you follow Edge AI and Privacy, and saved 2 talks by this speaker.",
    );
  });

  it("uses popularity only as a small prior", () => {
    // robots has the most saves but matches nothing: never outranks a relevant session.
    const r = run(["Typography"]);
    expect(r.picks[0]?.sessionId).toBe("type");
    expect(r.picks.map((p) => p.sessionId)).not.toContain("robots");
  });

  it("respects the limit and is deterministic", () => {
    const a = run(["Edge AI", "Accessibility", "Privacy"], [], { limit: 2 });
    const b = run(["Edge AI", "Accessibility", "Privacy"], [], { limit: 2 });
    expect(a.picks.length).toBe(2);
    expect(a).toEqual(b);
  });
});

describe("cold start (FR-15, UC-03)", () => {
  it("shows a track-balanced popular list without interests", () => {
    const r = run([]);
    expect(r.mode).toBe("popular");
    if (r.mode !== "popular") return;
    expect(r.label).toBe(POPULAR_LABEL);
    const tracks = r.picks.map((p) => program.find((s) => s.id === p.sessionId)!.trackName);
    expect(new Set(tracks).size).toBe(tracks.length); // one per track before any repeats
    expect(r.picks[0]?.sessionId).toBe("robots"); // most saved available session
    expect(r.picks[0]?.reason).toBe("Popular in the Robotics track.");
    expect(r.picks.map((p) => p.sessionId)).not.toContain("edge-canceled");
  });

  it("treats interests that appear nowhere in the program as no usable profile", () => {
    expect(run(["Quantum gardening"]).mode).toBe("popular");
  });

  it("returns an empty result when nothing can be suggested", () => {
    const r = recommend({ sessions: program, index, interests: ["Edge AI"], savedIds: new Set(), now: at("2027-05-17", "09:00") });
    expect(r.mode).toBe("empty");
    if (r.mode === "empty") expect(r.message).toBe(EMPTY_MESSAGE);
    expect(recommend({ sessions: [], index: buildIndex([]), interests: [], savedIds: new Set(), now: NOW }).mode).toBe("empty");
  });
});

describe("search (FR-10, FR-11)", () => {
  it("finds sessions by topic, speaker and partial words, most relevant first", () => {
    expect(searchSessions(index, program, "privacy")[0]?.sessionId).toBe("privacy");
    expect(searchSessions(index, program, "Madina")[0]?.sessionId).toBe("a11y");
    expect(searchSessions(index, program, "priv")[0]?.sessionId).toBe("privacy");
    const robotics = searchSessions(index, program, "robotics").map((h) => h.sessionId);
    expect(robotics[0]).toBe("robots");
  });

  it("returns nothing for an empty or unknown query", () => {
    expect(searchSessions(index, program, "  ")).toEqual([]);
    expect(searchSessions(index, program, "zzzz")).toEqual([]);
  });
});
