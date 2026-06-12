import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signupApiSchema } from "@/lib/validations/auth";
import { normalizePhone } from "@/lib/otp";
import { trackEvent } from "@/lib/analytics";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signupApiSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors)[0]?.[0];
      return NextResponse.json({ error: firstError || "Invalid input" }, { status: 400 });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const phoneRaw = parsed.data.phone?.trim();
    const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    if (phone) {
      const existingPhone = await prisma.user.findUnique({ where: { phone } });
      if (existingPhone) {
        return NextResponse.json({ error: "An account with this phone already exists." }, { status: 409 });
      }
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        phone: phone ?? undefined,
        passwordHash,
        emailVerified: new Date(),
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    trackEvent("signup", { userId: user.id, meta: { method: "credentials" } });
    return NextResponse.json(
      {
        message: "Account created successfully.",
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[SIGNUP_ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
