"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  const id = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(id);
}

/** Local hour of day (0-23) on the client, `null` during SSR. Re-checks every minute. */
export function useCurrentHour(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => new Date().getHours(),
    () => null,
  );
}
