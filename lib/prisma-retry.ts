import { Prisma } from "@prisma/client";

const RETRYABLE_CODES = new Set(["P1001", "P1002", "P1008", "P1017"]);

function isRetryablePrismaError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return RETRYABLE_CODES.has(error.code);
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    const message = error.message.toLowerCase();
    return message.includes("can't reach database server") || message.includes("connection");
  }
  return false;
}

/** Retry transient Neon wake-up / connection errors (P1001, etc.). */
export async function withPrismaRetry<T>(
  fn: () => Promise<T>,
  options?: { attempts?: number; delayMs?: number },
): Promise<T> {
  const attempts = options?.attempts ?? 4;
  const delayMs = options?.delayMs ?? 1500;

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryablePrismaError(error) || attempt === attempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}
