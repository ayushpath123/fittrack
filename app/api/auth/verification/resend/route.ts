import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cleanupAuthTokens, issueAuthToken } from "@/lib/authTokens";
import { sendVerificationEmail } from "@/lib/mailer";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, emailVerified: true },
    });

    if (!user) return NextResponse.json({ message: "If an account exists, a verification email has been sent." });
    if (user.emailVerified) return NextResponse.json({ message: "Email is already verified." });

    await cleanupAuthTokens(user.id, "EMAIL_VERIFY");
    const token = await issueAuthToken(user.id, "EMAIL_VERIFY", 60 * 24);
    const verifyUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/verify-email?token=${token}`;
    await sendVerificationEmail(email, verifyUrl);

    return NextResponse.json({
      message: "If an account exists, a verification email has been sent.",
      verifyUrl: process.env.NODE_ENV === "development" ? verifyUrl : undefined,
    });
  } catch (error) {
    console.error("[RESEND_VERIFICATION_ERROR]", error);
    return NextResponse.json({ error: "Unable to resend verification right now." }, { status: 500 });
  }
}
