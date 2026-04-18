import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signupApiSchema } from "@/lib/validations/auth";
import { cleanupAuthTokens, issueAuthToken } from "@/lib/authTokens";
import { sendVerificationEmail } from "@/lib/mailer";
import { normalizePhone } from "@/lib/otp";

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
    const phone = normalizePhone(parsed.data.phone);
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    const existingPhone = await prisma.user.findUnique({ where: { phone } });
    if (existingPhone) {
      return NextResponse.json({ error: "An account with this phone already exists." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        phone,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    await cleanupAuthTokens(user.id, "EMAIL_VERIFY");
    const verifyToken = await issueAuthToken(user.id, "EMAIL_VERIFY", 60 * 24);
    const verifyUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/verify-email?token=${verifyToken}`;
    await sendVerificationEmail(email, verifyUrl);

    return NextResponse.json(
      {
        message: "Account created successfully. Verification email sent.",
        user,
        verifyUrl: process.env.NODE_ENV === "development" ? verifyUrl : undefined,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[SIGNUP_ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
