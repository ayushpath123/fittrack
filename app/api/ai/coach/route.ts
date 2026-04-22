import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "DEPRECATED_ENDPOINT",
      message: "Use /api/coach instead.",
      replacement: "/api/coach",
    },
    { status: 410 },
  );
}
