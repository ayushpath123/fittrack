import { getAuthSession } from "@/lib/auth";

function getAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function requireAdminUser() {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  const email = session?.user?.email?.toLowerCase() ?? "";
  if (!userId || !email) {
    throw new Error("Unauthorized");
  }

  const admins = getAdminEmails();
  if (!admins.has(email)) {
    throw new Error("Forbidden");
  }

  return { userId, email };
}
