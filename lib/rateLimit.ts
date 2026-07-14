import { redis } from "@/lib/redis";

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 10;

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

// NextAuth's `authorize(credentials, req)` passes a plain headers object
// (not a Fetch Request), so it needs its own extraction helper.
export function getClientIpFromHeaderValue(
  value: string | string[] | undefined
): string {
  if (!value) return "unknown";
  const first = Array.isArray(value) ? value[0] : value;
  return first.split(",")[0].trim();
}

export async function checkRateLimit(
  routeKey: string,
  ip: string,
  options?: { windowMs?: number; maxRequests?: number }
): Promise<{ allowed: true } | { allowed: false; retryAfter: number }> {
  const windowMs = options?.windowMs ?? DEFAULT_WINDOW_MS;
  const maxRequests = options?.maxRequests ?? DEFAULT_MAX_REQUESTS;

  const now = Date.now();
  const windowStart = now - windowMs;
  const key = `ratelimit:${routeKey}:${ip}`;

  await redis.zremrangebyscore(key, 0, windowStart);
  const count = await redis.zcard(key);

  if (count >= maxRequests) {
    const oldest = await redis.zrange(key, 0, 0, "WITHSCORES");
    const oldestTimestamp = oldest[1] ? Number(oldest[1]) : now;
    const retryAfter = Math.max(
      1,
      Math.ceil((oldestTimestamp + windowMs - now) / 1000)
    );
    return { allowed: false, retryAfter };
  }

  await redis.zadd(key, now, `${now}-${Math.random()}`);
  await redis.pexpire(key, windowMs);

  return { allowed: true };
}
