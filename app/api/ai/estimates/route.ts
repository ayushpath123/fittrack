import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  void req;
  return NextResponse.json(
    {
      error: "DEPRECATED_ENDPOINT",
      message: "Use /api/analyze-meal and /api/meals instead.",
      replacements: ["/api/analyze-meal", "/api/meals"],
    },
    { status: 410 },
  );
}
