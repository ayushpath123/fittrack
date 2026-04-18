import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { consumeAuthToken, cleanupAuthTokens } from "@/lib/authTokens";
import { resetPasswordSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  const parsed = resetPasswordSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid reset payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const consumed = await consumeAuthToken(parsed.data.token, "PASSWORD_RESET");
  if (!consumed) {
    return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.update({
    where: { id: consumed.userId },
    data: { passwordHash },
  });
  await cleanupAuthTokens(consumed.userId, "PASSWORD_RESET");

  return NextResponse.json({ message: "Password reset successful." });
}
