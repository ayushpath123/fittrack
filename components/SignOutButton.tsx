"use client";

import toast from "react-hot-toast";
import { logout } from "@/lib/auth-client";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => {
        void logout().catch(() => {
          toast.error("Could not sign out. Try again.");
        });
      }}
      className="w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-700 transition-transform hover:bg-red-100 active:scale-95 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/40"
    >
      Sign out
    </button>
  );
}
