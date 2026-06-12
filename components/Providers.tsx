"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import { DailyReminder } from "@/components/DailyReminder";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <>
        <Toaster
          position="bottom-center"
          containerStyle={{ bottom: "calc(var(--app-bottom-nav-h) + 1rem)", zIndex: 99999 }}
          toastOptions={{
            duration: 4000,
            style: {
              background: "rgba(14,15,22,.97)",
              color: "#f4f4f5",
              border: "1px solid rgba(190,255,71,.35)",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: "500",
              boxShadow: "0 8px 32px rgba(0,0,0,.45)",
              maxWidth: "22rem",
            },
            success: {
              iconTheme: { primary: "#BEFF47", secondary: "#0a0c12" },
            },
            error: {
              duration: 8000,
              iconTheme: { primary: "#ff7d95", secondary: "#0a0c12" },
            },
          }}
        />
        <DailyReminder />
        {children}
      </>
    </SessionProvider>
  );
}
