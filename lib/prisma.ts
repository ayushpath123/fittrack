import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** After `prisma generate`, dev can keep an old PrismaClient on globalThis without new model delegates. */
function isStalePrismaClient(c: PrismaClient): boolean {
  return typeof (c as unknown as { hydrationLog?: unknown }).hydrationLog !== "object";
}

const existing = globalForPrisma.prisma;
if (existing && isStalePrismaClient(existing)) {
  void existing.$disconnect().catch(() => {});
  globalForPrisma.prisma = undefined;
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
