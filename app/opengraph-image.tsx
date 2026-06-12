import { ImageResponse } from "next/og";
import { loadDmSans700ForOg } from "@/lib/og-font-dm-sans-700";

export const runtime = "nodejs";
export const alt = "FitTrack — meals, workouts, weight and hydration in one tracker";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const dmSans = await loadDmSans700ForOg();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#08090F",
          gap: 36,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 28,
              background: "#BEFF47",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width={70} height={70} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M22 12h-4l-3 9L9 3l-3 9H2"
                stroke="#06080A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div
            style={{
              display: "flex",
              color: "#f4f4ff",
              fontFamily: "DM Sans",
              fontSize: 110,
              fontWeight: 700,
              letterSpacing: -2.2,
              lineHeight: 1,
            }}
          >
            FitTrack
          </div>
        </div>
        <div
          style={{
            display: "flex",
            color: "rgba(244,244,255,0.55)",
            fontFamily: "DM Sans",
            fontSize: 34,
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          Meals, workouts, weight &amp; water — with an AI coach
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "DM Sans", data: dmSans, style: "normal", weight: 700 }],
    },
  );
}
