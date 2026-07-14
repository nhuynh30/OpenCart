import { describe, it, expect, vi, beforeEach } from "vitest";
import { FakeRedis } from "../tests/fakeRedis";

const fakeRedis = new FakeRedis();
vi.mock("@/lib/redis", () => ({ redis: fakeRedis }));

const { checkRateLimit, getClientIp, getClientIpFromHeaderValue } = await import("./rateLimit");

describe("checkRateLimit", () => {
  beforeEach(() => {
    fakeRedis.reset();
  });

  it("allows requests under the limit", async () => {
    for (let i = 0; i < 5; i++) {
      const result = await checkRateLimit("test-route", "1.2.3.4", { maxRequests: 5, windowMs: 60_000 });
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks requests once the limit is exceeded", async () => {
    for (let i = 0; i < 5; i++) {
      await checkRateLimit("test-route", "1.2.3.4", { maxRequests: 5, windowMs: 60_000 });
    }
    const result = await checkRateLimit("test-route", "1.2.3.4", { maxRequests: 5, windowMs: 60_000 });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.retryAfter).toBeGreaterThan(0);
    }
  });

  it("tracks separate IPs independently", async () => {
    for (let i = 0; i < 5; i++) {
      await checkRateLimit("test-route", "1.1.1.1", { maxRequests: 5, windowMs: 60_000 });
    }
    const blocked = await checkRateLimit("test-route", "1.1.1.1", { maxRequests: 5, windowMs: 60_000 });
    const otherIp = await checkRateLimit("test-route", "2.2.2.2", { maxRequests: 5, windowMs: 60_000 });

    expect(blocked.allowed).toBe(false);
    expect(otherIp.allowed).toBe(true);
  });

  it("tracks separate route keys independently for the same IP", async () => {
    for (let i = 0; i < 5; i++) {
      await checkRateLimit("route-a", "1.2.3.4", { maxRequests: 5, windowMs: 60_000 });
    }
    const blockedA = await checkRateLimit("route-a", "1.2.3.4", { maxRequests: 5, windowMs: 60_000 });
    const routeB = await checkRateLimit("route-b", "1.2.3.4", { maxRequests: 5, windowMs: 60_000 });

    expect(blockedA.allowed).toBe(false);
    expect(routeB.allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("prefers x-forwarded-for, taking the first IP", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "9.9.9.9, 1.1.1.1" },
    });
    expect(getClientIp(req)).toBe("9.9.9.9");
  });

  it("falls back to x-real-ip", () => {
    const req = new Request("http://localhost", {
      headers: { "x-real-ip": "8.8.8.8" },
    });
    expect(getClientIp(req)).toBe("8.8.8.8");
  });

  it("returns 'unknown' when no IP headers are present", () => {
    const req = new Request("http://localhost");
    expect(getClientIp(req)).toBe("unknown");
  });
});

describe("getClientIpFromHeaderValue", () => {
  it("handles a plain string", () => {
    expect(getClientIpFromHeaderValue("1.2.3.4")).toBe("1.2.3.4");
  });

  it("handles an array, taking the first entry", () => {
    expect(getClientIpFromHeaderValue(["5.6.7.8", "9.9.9.9"])).toBe("5.6.7.8");
  });

  it("returns 'unknown' for undefined", () => {
    expect(getClientIpFromHeaderValue(undefined)).toBe("unknown");
  });
});
