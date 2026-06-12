"use client";

/** Best-effort client event tracking; silently no-ops on failure. */
export function track(name: string, meta?: Record<string, unknown>): void {
  try {
    const body = JSON.stringify({ name, meta });
    if (typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      credentials: "include",
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}
