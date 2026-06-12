"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * True once the component is hydrated on the client, false during SSR.
 * Replaces the `useEffect(() => setMounted(true), [])` pattern without an
 * extra state update after mount.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);
}
