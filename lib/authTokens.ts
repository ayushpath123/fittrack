import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_BYTES = 32;

export type AuthTokenType = "EMAIL_VERIFY" | "PASSWORD_RESET";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function issueAuthToken(userId: string, type: AuthTokenType, expiresInMinutes: number) {
  const token = crypto.randomBytes(TOKEN_BYTES).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60_000);

  await prisma.authToken.create({
    data: { userId, type, tokenHash, expiresAt },
  });

  return token;
}

export async function consumeAuthToken(token: string, type: AuthTokenType) {
  const tokenHash = hashToken(token);
  const now = new Date();
  const authToken = await prisma.authToken.findFirst({
    where: {
      type,
      tokenHash,
      usedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!authToken) return null;

  await prisma.authToken.update({
    where: { id: authToken.id },
    data: { usedAt: now },
  });

  return authToken;
}

export async function cleanupAuthTokens(userId: string, type: AuthTokenType) {
  await prisma.authToken.deleteMany({ where: { userId, type } });
}
