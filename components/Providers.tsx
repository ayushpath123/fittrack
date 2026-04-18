"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import { DailyReminder } from "@/components/DailyReminder";
import { ThemeProvider } from "@/components/ThemeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <ThemeProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#ffffff",
              color: "#1f2937",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: "500",
            },
          }}
        />
        <DailyReminder />
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
