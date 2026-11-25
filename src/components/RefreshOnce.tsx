"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Refreshes server components once after mount. Used when a page changed data during its own
 * render (e.g. marked messages read) so the header badge, rendered in parallel, catches up.
 */
export function RefreshOnce({ when }: { when: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (when) router.refresh();
  }, [when, router]);
  return null;
}
