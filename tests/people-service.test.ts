import { beforeAll, describe, expect, it } from "vitest";
import { parseList, validateProfile, type ProfileInput } from "@/lib/people/profile-input";
import { createTempDb } from "./helpers/temp-db";

// Connections and messages on a temporary SQLite database (UC-04, DR-05, FR-09).
type Db = Awaited<ReturnType<typeof createTempDb>>;
let db: Db;
let t: typeof import("@/db/schema");
let people: typeof import("@/server/people");
const EVENT = "ev_test";

beforeAll(async () => {
  db = await createTempDb();
  t = await import("@/db/schema");
  people = await import("@/server/people");
  db.insert(t.events)
    .values({
      id: EVENT, slug: "test", name: "Test Summit", code: "TEST", startsOn: "2027-05-15", endsOn: "2027-05-15",
      timeZone: "Asia/Almaty", city: "Astana", venueName: "Hall", organizerName: "Org", brandColor: "#5B3DF5", logoUrl: "/logo.svg",
    })
    .run();
  db.insert(t.interests).values([{ id: "in_edge", label: "Edge AI" }, { id: "in_priv", label: "Privacy" }]).run();
  const person = (id: string, name: string, networking: boolean, showInterests = true) => {
    db.insert(t.users).values({ id, name, email: `${id}@example.com`, createdAt: 0 }).run();
    db.insert(t.profiles).values({ userId: id, title: "Engineer", networkingOptIn: networking, showInterests, updatedAt: 0 }).run();
    db.insert(t.memberships).values({ eventId: EVENT, userId: id, role: "participant", registeredAt: 0 }).run();
    db.insert(t.userInterests).values({ userId: id, interestId: "in_edge", position: 0 }).run();
  };
  person("dana", "Dana Seitkali", true);
  person("aruzhan", "Aruzhan Kassymova", true);
  person("ruslan", "Ruslan Bekmukhanov", false);
  person("hidden", "Hidden Person", true, false);
  db.insert(t.users).values({ id: "stranger", name: "Not Here", email: "x@example.com", createdAt: 0 }).run();
});

const notificationsFor = (userId: string) => db.select().from(t.notifications).all().filter((n) => n.userId === userId);

describe("connections (UC-04)", () => {
  it("sends a request with a notification built from visible fields", () => {
    const c = people.requestConnection(EVENT, "dana", "aruzhan", 100);
    expect(c.status).toBe("pending");
    const [n] = notificationsFor("aruzhan");
    expect(n?.title).toBe("Dana S. wants to connect");
    expect(n?.body).toBe("Engineer. You both follow Edge AI.");
    // Asking again changes nothing.
    expect(people.requestConnection(EVENT, "dana", "aruzhan", 101).id).toBe(c.id);
  });

  it("blocks messages until the request is accepted", () => {
    const c = people.connectionsFor(EVENT, "dana").find((x) => x.otherId === "aruzhan")!;
    expect(() => people.sendMessage(EVENT, c.id, "dana", "Hi", 102)).toThrow("You can message once Aruzhan accepts your request.");
  });

  it("only the recipient can answer; then both can message", () => {
    const c = people.connectionsFor(EVENT, "dana").find((x) => x.otherId === "aruzhan")!;
    expect(() => people.respondToConnection(EVENT, c.id, "dana", true, 103)).toThrow("Only the person who got the request");
    people.respondToConnection(EVENT, c.id, "aruzhan", true, 104);
    expect(notificationsFor("dana").at(-1)?.title).toBe("Aruzhan K. accepted your request");
    people.sendMessage(EVENT, c.id, "aruzhan", "Are you staying for the closing panel?", 105);
    people.sendMessage(EVENT, c.id, "dana", "Yes.", 106);
    expect(people.listMessages(c.id).map((m) => m.body)).toEqual(["Are you staying for the closing panel?", "Yes."]);
    expect(notificationsFor("dana").at(-1)?.kind).toBe("message");
  });

  it("keeps conversations private to the two people", () => {
    const c = people.connectionsFor(EVENT, "dana").find((x) => x.otherId === "aruzhan")!;
    expect(() => people.getConnection(EVENT, c.id, "hidden")).toThrow("We couldn't find this conversation.");
    expect(() => people.sendMessage(EVENT, c.id, "hidden", "hi", 107)).toThrow();
  });

  it("refuses people who are not open to networking, not at the event, or yourself", () => {
    expect(() => people.requestConnection(EVENT, "dana", "ruslan", 108)).toThrow("Ruslan isn't open to networking.");
    expect(() => people.requestConnection(EVENT, "ruslan", "dana", 108)).toThrow("Open to networking");
    expect(() => people.requestConnection(EVENT, "dana", "stranger", 108)).toThrow("isn't at this event");
    expect(() => people.requestConnection(EVENT, "dana", "dana", 108)).toThrow("yourself");
  });

  it("does not name hidden interests in the request", () => {
    people.requestConnection(EVENT, "hidden", "dana", 109);
    expect(notificationsFor("dana").at(-1)?.body).toBe("Engineer.");
  });

  it("declined requests cannot be sent again", () => {
    const c = people.connectionsFor(EVENT, "dana").find((x) => x.otherId === "hidden")!;
    people.respondToConnection(EVENT, c.id, "dana", false, 110);
    expect(() => people.requestConnection(EVENT, "hidden", "dana", 111)).toThrow("another request");
    expect(() => people.respondToConnection(EVENT, c.id, "dana", true, 112)).toThrow("already answered");
  });
});

describe("profile validation (UC-01)", () => {
  const ok: ProfileInput = {
    email: "dana@example.com",
    organization: "Esil Polytechnic",
    title: "PhD student",
    bio: "",
    skills: ["PyTorch"],
    interests: ["Edge AI"],
    networkingOptIn: true,
    visibility: { organization: true, title: true, interests: true, bio: false, skills: false },
  };

  it("accepts a valid profile", () => {
    expect(validateProfile(ok, ["Edge AI", "Privacy"])).toEqual({});
  });

  it("explains a bad email with the approved copy", () => {
    expect(validateProfile({ ...ok, email: "dana@example" }, ["Edge AI"]).email).toBe("Enter an email like name@example.com.");
  });

  it("limits bio length, skills and interests to known ones", () => {
    const errors = validateProfile({ ...ok, bio: "x".repeat(501), interests: ["Astrology"] }, ["Edge AI"]);
    expect(errors.bio).toContain("under 500 characters");
    expect(errors.interests).toBe("Pick interests from the list.");
  });

  it("parses comma-separated skills without duplicates", () => {
    expect(parseList("Python, ROS ,, python, C++")).toEqual(["Python", "ROS", "C++"]);
  });

  it("saves the profile and replaces interests", () => {
    people.updateProfile("dana", { ...ok, interests: ["Privacy", "Edge AI"] }, 200);
    const p = people.getProfile("dana")!;
    expect(p.interests).toEqual(["Privacy", "Edge AI"]);
    expect(p.organization).toBe("Esil Polytechnic");
    expect(p.visibility.bio).toBe(false);
  });
});
