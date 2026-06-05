import { PrismaClient } from "@prisma/client";

const MAX_ATTEMPTS = 5;
const RETRY_MS = 2000;

function isRetryable(error) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Can't reach database server") ||
    message.includes("P1001") ||
    message.includes("P1000") ||
    message.includes("Connection timed out")
  );
}

async function warmDatabase() {
  const host = process.env.DATABASE_URL?.includes("localhost") ? "local Postgres" : "Neon";
  console.log(`[db:warm] Waking ${host} before dev server…`);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const prisma = new PrismaClient();
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log(`[db:warm] Database ready (attempt ${attempt}/${MAX_ATTEMPTS}).`);
      return;
    } catch (error) {
      if (attempt < MAX_ATTEMPTS && isRetryable(error)) {
        console.log(`[db:warm] Not ready yet (attempt ${attempt}/${MAX_ATTEMPTS}). Retrying in ${RETRY_MS / 1000}s…`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
        continue;
      }
      console.warn(
        `[db:warm] Could not connect after ${attempt} attempt(s). Starting dev anyway — refresh the page if you see DB errors.`,
      );
      if (error instanceof Error) {
        console.warn(`[db:warm] ${error.message.split("\n")[0]}`);
      }
      return;
    } finally {
      await prisma.$disconnect().catch(() => {});
    }
  }
}

await warmDatabase();
