import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { normalizePhone, verifyOtp } from "@/lib/otp";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = (await req.json()) as { otp?: string; phone?: string };
    const otp = body.otp?.trim() ?? "";
    if (!body.phone) {
      return NextResponse.json({ error: "Phone is required." }, { status: 400 });
    }
    const phone = normalizePhone(body.phone);
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json({ error: "Enter valid 6-digit OTP." }, { status: 400 });
    }
    const ok = await verifyOtp(phone, otp, "signup");
    if (!ok) {
      return NextResponse.json({ error: "Invalid or expired OTP." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { phone }, select: { id: true } });
    if (existing && existing.id !== userId) {
      return NextResponse.json({ error: "This phone number is already in use." }, { status: 409 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { phone, phoneVerified: new Date() },
    });
    return NextResponse.json({ verified: true, phone });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[settings phone verify confirm]", e);
    return NextResponse.json({ error: "Verification failed." }, { status: 500 });
  }
}
