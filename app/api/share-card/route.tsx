import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { loadDmSans700ForOg } from "@/lib/og-font-dm-sans-700";
import { appOrigin } from "@/lib/stripe";

export const runtime = "nodejs";

const RANKS = new Set(["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Legend"]);

function clampInt(raw: string | null, min: number, max: number, fallback: number): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const streak = clampInt(params.get("streak"), 1, 9999, 1);
  const level = clampInt(params.get("level"), 1, 999, 1);
  const rankRaw = params.get("rank") ?? "Bronze";
  const rank = RANKS.has(rankRaw) ? rankRaw : "Bronze";
  const host = new URL(appOrigin()).host;

  const dmSans = await loadDmSans700ForOg();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#08090F",
          fontFamily: "DM Sans",
          padding: 72,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -260,
            left: -260,
            width: 640,
            height: 640,
            borderRadius: 9999,
            background: "rgba(190,255,71,0.12)",
            filter: "blur(120px)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -240,
            right: -240,
            width: 560,
            height: 560,
            borderRadius: 9999,
            background: "rgba(74,126,255,0.12)",
            filter: "blur(110px)",
            display: "flex",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 20,
              background: "#BEFF47",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width={44} height={44} viewBox="0 0 24 24" fill="none">
              <path
                d="M22 12h-4l-3 9L9 3l-3 9H2"
                stroke="#06080A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div style={{ display: "flex", color: "#f4f4ff", fontSize: 56, fontWeight: 700, letterSpacing: -1.5 }}>
            FitTrack
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <svg width={130} height={130} viewBox="0 0 24 24" fill="rgba(255,159,69,0.28)">
            <path
              d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
              stroke="#FFB547"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 18,
              color: "#f4f4ff",
              fontSize: 168,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: -6,
            }}
          >
            {String(streak)}
            <div style={{ display: "flex", fontSize: 54, letterSpacing: -1, color: "rgba(244,244,255,0.6)" }}>
              day streak
            </div>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 30,
              alignItems: "center",
              gap: 12,
              borderRadius: 9999,
              border: "2px solid rgba(190,255,71,0.4)",
              background: "rgba(190,255,71,0.12)",
              color: "#D6FF9C",
              padding: "14px 34px",
              fontSize: 40,
              fontWeight: 700,
            }}
          >
            Level {level} · {rank}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", color: "rgba(244,244,255,0.5)", fontSize: 32, fontWeight: 700 }}>
            Log meals in one tap
          </div>
          <div style={{ display: "flex", color: "#BEFF47", fontSize: 32, fontWeight: 700 }}>{host}</div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
      fonts: [{ name: "DM Sans", data: dmSans, style: "normal", weight: 700 }],
      headers: {
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
