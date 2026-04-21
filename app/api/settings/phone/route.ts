import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { normalizePhone } from "@/lib/otp";

export async function PUT(req: Request) {
  try {
    const userId = await requireUserId();
    const body = (await req.json()) as { phone?: string };
    if (!body.phone) {
      return NextResponse.json({ error: "Phone is required." }, { status: 400 });
    }

    let phone: string;
    try {
      phone = normalizePhone(body.phone);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid phone number." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { phone }, select: { id: true } });
    if (existing && existing.id !== userId) {
      return NextResponse.json({ error: "This phone number is already in use." }, { status: 409 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { phone, phoneVerified: null },
      select: { phone: true, phoneVerified: true },
    });
    return NextResponse.json({
      phone: updated.phone,
      phoneVerified: !!updated.phoneVerified,
      message: "Phone saved. Verify it with OTP to enable billing.",
    });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[settings phone PUT]", e);
    return NextResponse.json({ error: "Could not update phone." }, { status: 500 });
  }
}
