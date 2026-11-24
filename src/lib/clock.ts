// Demo clock. The event is in May 2027, so the app runs on a virtual clock that starts at a set
// moment and moves in real time. All "what time is it" checks go through now().
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { appSettings } from "@/db/schema";

export const CLOCK_KEY = "demo_clock";

export type ClockSetting = {
  /** Virtual instant shown when the clock was last set (epoch ms). */
  virtualAt: number;
  /** Real instant when it was set (epoch ms). */
  realAt: number;
};

/** Pure: the virtual time for a real instant. */
export function clockNow(setting: ClockSetting, realNow: number): number {
  return setting.virtualAt + (realNow - setting.realAt);
}

export function parseClockSetting(value: string | undefined): ClockSetting | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<ClockSetting>;
    return typeof parsed.virtualAt === "number" && typeof parsed.realAt === "number"
      ? { virtualAt: parsed.virtualAt, realAt: parsed.realAt }
      : null;
  } catch {
    return null;
  }
}

/** Current demo time (epoch ms). Falls back to the real clock if the demo clock was never set. */
export function now(): number {
  const row = getDb().select().from(appSettings).where(eq(appSettings.key, CLOCK_KEY)).get();
  const setting = parseClockSetting(row?.value);
  return setting ? clockNow(setting, Date.now()) : Date.now();
}

/** Moves the demo clock to `virtualAt`; it keeps running from there. */
export function setClock(virtualAt: number): void {
  const value = JSON.stringify({ virtualAt, realAt: Date.now() } satisfies ClockSetting);
  getDb()
    .insert(appSettings)
    .values({ key: CLOCK_KEY, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } })
    .run();
}
