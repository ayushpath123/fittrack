import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin";

export async function GET() {
  try {
    await requireAdminUser();
    return NextResponse.json({ isAdmin: true });
  } catch {
    return NextResponse.json({ isAdmin: false });
  }
}
