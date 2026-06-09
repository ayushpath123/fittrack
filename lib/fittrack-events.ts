export const LOGS_UPDATED_EVENT = "fittrack:logs-updated";

/** Call after any log is saved (voice, camera, manual) so dashboards can refresh. */
export function notifyLogsUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(LOGS_UPDATED_EVENT));
}
