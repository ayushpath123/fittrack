import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

/** Prisma + bcrypt in JWT callback require Node (not Edge). */
export const runtime = "nodejs";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
