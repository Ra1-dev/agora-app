"use client";

import { useEffect, useState } from "react";

/**
 * Times are always in the event's zone; when the device is elsewhere, say so:
 * "11:30 Astana time" (design-decisions §3). Rendered after mount to avoid a hydration mismatch.
 */
export function ZoneHint({ timeZone, city }: { timeZone: string; city: string }) {
  const [differs, setDiffers] = useState(false);
  useEffect(() => {
    const device = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = (tz: string) =>
      new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "numeric", hourCycle: "h23" }).format(new Date());
    setDiffers(device !== timeZone && offset(device) !== offset(timeZone));
  }, [timeZone]);
  return differs ? <> {city} time</> : null;
}
