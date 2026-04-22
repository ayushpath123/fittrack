import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      error: "DEPRECATED_ENDPOINT",
      message: "Use /api/analyze-meal instead.",
      replacement: "/api/analyze-meal",
    },
    { status: 410 },
  );
}
