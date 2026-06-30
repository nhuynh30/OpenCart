import { redis } from "@/lib/redis";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export async function checkRateLimit(
  routeKey: string,
  ip: string
): Promise<{ allowed: true } | { allowed: false; retryAfter: number }> {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const key = `ratelimit:${routeKey}:${ip}`;

  await redis.zremrangebyscore(key, 0, windowStart);
  const count = await redis.zcard(key);

  if (count >= MAX_REQUESTS) {
    const oldest = await redis.zrange(key, 0, 0, "WITHSCORES");
    const oldestTimestamp = oldest[1] ? Number(oldest[1]) : now;
    const retryAfter = Math.max(
      1,
      Math.ceil((oldestTimestamp + WINDOW_MS - now) / 1000)
    );
    return { allowed: false, retryAfter };
  }

  await redis.zadd(key, now, `${now}-${Math.random()}`);
  await redis.pexpire(key, WINDOW_MS);

  return { allowed: true };
}
