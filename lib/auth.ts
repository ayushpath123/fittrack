import { randomBytes } from "crypto";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema, phoneLoginSchema } from "@/lib/validations/auth";
import { normalizePhone, verifyOtp } from "@/lib/otp";

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    id: "phone-otp",
    name: "Phone OTP",
    credentials: {
      phone: { label: "Phone", type: "text" },
      otp: { label: "OTP", type: "text" },
    },
    async authorize(credentials) {
      try {
        const parsed = phoneLoginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const phone = normalizePhone(parsed.data.phone);
        const valid = await verifyOtp(phone, parsed.data.otp, "login");
        if (!valid) return null;

        const user = await prisma.user.findUnique({ where: { phone } });
        if (!user) return null;

        if (!user.phoneVerified) {
          await prisma.user.update({
            where: { id: user.id },
            data: { phoneVerified: new Date() },
          });
        }

        return { id: user.id, email: user.email };
      } catch {
        return null;
      }
    },
  }),
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const parsed = loginSchema.safeParse(credentials);
      if (!parsed.success) return null;

      const email = parsed.data.email.trim().toLowerCase();
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return null;

      const ok = await compare(parsed.data.password, user.passwordHash);
      if (!ok) return null;

      return { id: user.id, email: user.email };
    },
  }),
];

const googleClientId = process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;
if (googleClientId && googleClientSecret) {
  providers.unshift(
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    })
  );
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers,
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // Google OAuth must map to a Prisma User row; otherwise token.sub is a provider id and FKs (e.g. GoalSetting) fail.
      if (user && account?.provider === "google") {
        const emailRaw =
          profile && typeof profile === "object" && "email" in profile && typeof (profile as { email?: string }).email === "string"
            ? (profile as { email: string }).email
            : user.email;
        const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : null;
        if (!email) {
          console.error("[auth] Google sign-in rejected: missing email on profile");
          throw new Error("GoogleSignInMissingEmail");
        }
        try {
          const dbUser = await prisma.user.upsert({
            where: { email },
            create: {
              email,
              passwordHash: await hash(randomBytes(32).toString("hex"), 12),
              emailVerified: new Date(),
            },
            update: {},
          });
          token.sub = dbUser.id;
          return token;
        } catch (e) {
          console.error("[auth] Google user upsert failed", e);
          throw e;
        }
      }
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};

export function getAuthSession() {
  return getServerSession(authOptions);
}

export async function requireUserId() {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Unauthorized");
  return userId;
}
