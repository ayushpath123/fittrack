"use client";

import { signOut } from "next-auth/react";

/** Ends the NextAuth session and navigates to login only after the server clears cookies (avoids /login → /dashboard bounce when the session was not cleared). */
export function logout() {
  return signOut({ callbackUrl: "/login" });
}
