import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { cleanupAuthTokens, issueAuthToken } from "@/lib/authTokens";
import { sendResetPasswordEmail } from "@/lib/mailer";

export async function POST(request: Request) {
  try {
    const parsed = forgotPasswordSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ message: "If an account exists, a reset link has been sent." });
    }

    await cleanupAuthTokens(user.id, "PASSWORD_RESET");
    const token = await issueAuthToken(user.id, "PASSWORD_RESET", 30);
    const resetUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;
    await sendResetPasswordEmail(email, resetUrl);

    return NextResponse.json({
      message: "If an account exists, a reset link has been sent.",
      resetUrl: process.env.NODE_ENV === "development" ? resetUrl : undefined,
    });
  } catch (error) {
    console.error("[FORGOT_PASSWORD_ERROR]", error);
    return NextResponse.json({ error: "Unable to process request right now." }, { status: 500 });
  }
}
