import { describe, it, expect, vi, beforeEach } from "vitest";
import { FakeRedis } from "../../../tests/fakeRedis";

const fakeRedis = new FakeRedis();
vi.mock("@/lib/redis", () => ({ redis: fakeRedis }));

const getServerSession = vi.fn();
vi.mock("next-auth", () => ({ getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

const prismaProduct = { findMany: vi.fn() };
const prismaOrder = { createMany: vi.fn() };
vi.mock("@/lib/prisma", () => ({ prisma: { product: prismaProduct, order: prismaOrder } }));

const sessionsCreate = vi.fn();
vi.mock("@/lib/stripe", () => ({
  stripe: { checkout: { sessions: { create: (...args: unknown[]) => sessionsCreate(...args) } } },
}));

const { POST } = await import("./route");

function makeReq(body: object) {
  return new Request("http://localhost/api/checkout", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const onboardedSeller = { id: "seller-1", stripeAccountId: "acct_1", stripeOnboarded: true };

function makeProduct(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "prod-1",
    name: "Widget",
    description: null,
    imageUrl: null,
    price: 1000,
    active: true,
    store: { sellerId: "seller-1", seller: onboardedSeller },
    ...overrides,
  };
}

describe("POST /api/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fakeRedis.reset();
    getServerSession.mockResolvedValue({ user: { id: "buyer-1", role: "BUYER" } });
    prismaOrder.createMany.mockResolvedValue({ count: 1 });
    sessionsCreate.mockResolvedValue({ id: "cs_test_1", url: "https://checkout.stripe.com/pay/cs_test_1" });
  });

  it("rejects unauthenticated requests", async () => {
    getServerSession.mockResolvedValue(null);
    prismaProduct.findMany.mockResolvedValue([makeProduct()]);
    const res = await POST(makeReq({ productId: "prod-1" }));
    expect(res.status).toBe(401);
  });

  it("rejects a request with neither productId nor items", async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it("rejects an item with a quantity over the cap", async () => {
    const res = await POST(makeReq({ items: [{ productId: "prod-1", quantity: 150 }] }));
    expect(res.status).toBe(400);
  });

  it("404s when a product doesn't exist or is inactive", async () => {
    prismaProduct.findMany.mockResolvedValue([]);
    const res = await POST(makeReq({ productId: "prod-1" }));
    expect(res.status).toBe(404);
  });

  it("rejects a cart spanning multiple stores", async () => {
    prismaProduct.findMany.mockResolvedValue([
      makeProduct({ id: "prod-1", store: { sellerId: "seller-1", seller: onboardedSeller } }),
      makeProduct({ id: "prod-2", store: { sellerId: "seller-2", seller: onboardedSeller } }),
    ]);
    const res = await POST(
      makeReq({ items: [{ productId: "prod-1", quantity: 1 }, { productId: "prod-2", quantity: 1 }] })
    );
    expect(res.status).toBe(400);
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it("blocks checkout when the seller hasn't finished Stripe onboarding", async () => {
    prismaProduct.findMany.mockResolvedValue([
      makeProduct({ store: { sellerId: "seller-1", seller: { ...onboardedSeller, stripeOnboarded: false } } }),
    ]);
    const res = await POST(makeReq({ productId: "prod-1" }));
    expect(res.status).toBe(422);
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it("creates a Stripe session with a 3% platform fee and matching Order rows", async () => {
    prismaProduct.findMany.mockResolvedValue([makeProduct({ price: 2000 })]);

    const res = await POST(makeReq({ productId: "prod-1" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.url).toBe("https://checkout.stripe.com/pay/cs_test_1");

    expect(sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_intent_data: expect.objectContaining({
          application_fee_amount: 60, // 3% of 2000
          transfer_data: { destination: "acct_1" },
        }),
      })
    );

    expect(prismaOrder.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          buyerId: "buyer-1",
          sellerId: "seller-1",
          productId: "prod-1",
          amountTotal: 2000,
          platformFee: 60,
          status: "PENDING",
          stripeSessionId: "cs_test_1",
        }),
      ],
    });
  });

  it("sums quantities for a repeated productId in a cart", async () => {
    prismaProduct.findMany.mockResolvedValue([makeProduct({ price: 1000 })]);

    await POST(
      makeReq({ items: [{ productId: "prod-1", quantity: 2 }, { productId: "prod-1", quantity: 3 }] })
    );

    expect(prismaOrder.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ amountTotal: 5000 })], // 5 total units * 1000
    });
  });

  it("returns 500 and does not create orders if Stripe session creation fails", async () => {
    prismaProduct.findMany.mockResolvedValue([makeProduct()]);
    sessionsCreate.mockRejectedValue(new Error("stripe down"));

    const res = await POST(makeReq({ productId: "prod-1" }));
    expect(res.status).toBe(500);
    expect(prismaOrder.createMany).not.toHaveBeenCalled();
  });
});
