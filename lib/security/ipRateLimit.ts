import { Redis } from "@upstash/redis";

type Bucket = {
  count: number;
  windowStart: number;
};

const buckets = new Map<string, Bucket>();

let redisClient: Redis | null | undefined;

function getRedisClient() {
  if (redisClient !== undefined) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redisClient = null;
    return redisClient;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

function consume(key: string, limit: number, windowMs: number): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= windowMs) {
    bucket = { count: 0, windowStart: now };
    buckets.set(key, bucket);
  }

  if (bucket.count >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - bucket.windowStart)) / 1000));
    return { ok: false, retryAfterSec };
  }

  bucket.count += 1;
  return { ok: true };
}

export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}

async function consumeRedis(
  redis: Redis,
  key: string,
  limit: number,
  windowSec: number
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSec);
  }

  if (count > limit) {
    const ttl = await redis.ttl(key);
    return { ok: false, retryAfterSec: Math.max(1, ttl ?? 1) };
  }

  return { ok: true };
}

export async function checkOtpIpRateLimit(ip: string): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const redis = getRedisClient();
  if (redis) {
    const perMinute = await consumeRedis(redis, `otp:${ip}:1m`, 5, 60);
    if (!perMinute.ok) return perMinute;

    const perHour = await consumeRedis(redis, `otp:${ip}:1h`, 30, 60 * 60);
    if (!perHour.ok) return perHour;

    return { ok: true };
  }

  const perMinute = consume(`otp:${ip}:1m`, 5, 60 * 1000);
  if (!perMinute.ok) return perMinute;

  const perHour = consume(`otp:${ip}:1h`, 30, 60 * 60 * 1000);
  if (!perHour.ok) return perHour;

  return { ok: true };
}
