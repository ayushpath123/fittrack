import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeAuthToken } from "@/lib/authTokens";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const consumed = await consumeAuthToken(token, "EMAIL_VERIFY");
  if (!consumed) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: consumed.userId },
    data: { emailVerified: new Date() },
  });

  return NextResponse.json({ message: "Email verified successfully" });
}
