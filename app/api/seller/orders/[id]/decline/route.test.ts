import { describe, it, expect, vi, beforeEach } from "vitest";

const getServerSession = vi.fn();
vi.mock("next-auth", () => ({ getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

const prismaOrder = {
  findUnique: vi.fn(),
  findMany: vi.fn(),
  updateMany: vi.fn(),
};
vi.mock("@/lib/prisma", () => ({ prisma: { order: prismaOrder } }));

const stripeRefundsCreate = vi.fn();
const stripeSessionsRetrieve = vi.fn();
vi.mock("@/lib/stripe", () => ({
  stripe: {
    refunds: { create: (...args: unknown[]) => stripeRefundsCreate(...args) },
    checkout: { sessions: { retrieve: (...args: unknown[]) => stripeSessionsRetrieve(...args) } },
  },
}));

const emailsSend = vi.fn().mockResolvedValue({});
vi.mock("@/lib/resend", () => ({
  resend: { emails: { send: (...args: unknown[]) => emailsSend(...args) } },
  FROM_EMAIL: "test@opencart.dev",
}));

vi.mock("@/lib/emails/orderDeclined", () => ({
  orderDeclinedHtml: () => "<html></html>",
}));

const { POST } = await import("./route");

function makeReq() {
  return new Request("http://localhost/api/seller/orders/order-1/decline", { method: "POST" });
}

const baseOrder = {
  id: "order-1",
  sellerId: "seller-1",
  status: "PAID",
  stripeSessionId: "cs_test_123",
  shippedAt: null,
  amountTotal: 5000,
  buyer: { email: "buyer@example.com" },
  product: { name: "Widget", store: { name: "Test Store" } },
};

describe("POST /api/seller/orders/[id]/decline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { id: "seller-1", role: "SELLER" } });
    prismaOrder.findUnique.mockResolvedValue(baseOrder);
    prismaOrder.findMany.mockResolvedValue([baseOrder]);
    prismaOrder.updateMany.mockResolvedValue({ count: 1 });
    stripeSessionsRetrieve.mockResolvedValue({ payment_intent: "pi_123" });
    stripeRefundsCreate.mockResolvedValue({ id: "re_123" });
  });

  it("rejects unauthenticated requests", async () => {
    getServerSession.mockResolvedValue(null);
    const res = await POST(makeReq(), { params: Promise.resolve({ id: "order-1" }) });
    expect(res.status).toBe(401);
  });

  it("rejects non-seller roles", async () => {
    getServerSession.mockResolvedValue({ user: { id: "buyer-1", role: "BUYER" } });
    const res = await POST(makeReq(), { params: Promise.resolve({ id: "order-1" }) });
    expect(res.status).toBe(401);
  });

  it("404s when the order doesn't belong to this seller", async () => {
    prismaOrder.findUnique.mockResolvedValue({ ...baseOrder, sellerId: "someone-else" });
    const res = await POST(makeReq(), { params: Promise.resolve({ id: "order-1" }) });
    expect(res.status).toBe(404);
  });

  it("404s when the order doesn't exist", async () => {
    prismaOrder.findUnique.mockResolvedValue(null);
    const res = await POST(makeReq(), { params: Promise.resolve({ id: "order-1" }) });
    expect(res.status).toBe(404);
  });

  it("refuses to decline an order that isn't PAID", async () => {
    prismaOrder.findUnique.mockResolvedValue({ ...baseOrder, status: "PENDING" });
    const res = await POST(makeReq(), { params: Promise.resolve({ id: "order-1" }) });
    expect(res.status).toBe(422);
    expect(stripeRefundsCreate).not.toHaveBeenCalled();
  });

  it("refuses to decline an order that has already shipped", async () => {
    prismaOrder.findMany.mockResolvedValue([{ ...baseOrder, shippedAt: new Date() }]);
    const res = await POST(makeReq(), { params: Promise.resolve({ id: "order-1" }) });
    expect(res.status).toBe(409);
    expect(stripeRefundsCreate).not.toHaveBeenCalled();
  });

  it("refuses to decline an order that's already refunded", async () => {
    prismaOrder.findMany.mockResolvedValue([{ ...baseOrder, status: "REFUNDED" }]);
    const res = await POST(makeReq(), { params: Promise.resolve({ id: "order-1" }) });
    expect(res.status).toBe(409);
    expect(stripeRefundsCreate).not.toHaveBeenCalled();
  });

  it("issues the refund with transfer/fee reversal and marks the order REFUNDED", async () => {
    const res = await POST(makeReq(), { params: Promise.resolve({ id: "order-1" }) });
    expect(res.status).toBe(200);

    expect(stripeRefundsCreate).toHaveBeenCalledWith({
      payment_intent: "pi_123",
      reverse_transfer: true,
      refund_application_fee: true,
    });
    expect(prismaOrder.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "REFUNDED" }) })
    );
    expect(emailsSend).toHaveBeenCalled();
  });

  it("self-heals when Stripe reports the charge was already refunded", async () => {
    stripeRefundsCreate.mockRejectedValue({ code: "charge_already_refunded" });
    const res = await POST(makeReq(), { params: Promise.resolve({ id: "order-1" }) });

    expect(res.status).toBe(200);
    expect(prismaOrder.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "REFUNDED" }) })
    );
  });

  it("returns a sanitized 502 for genuine refund failures, without touching the DB", async () => {
    stripeRefundsCreate.mockRejectedValue({ code: "card_declined", message: "raw stripe internals" });
    const res = await POST(makeReq(), { params: Promise.resolve({ id: "order-1" }) });
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.error).not.toContain("raw stripe internals");
    expect(prismaOrder.updateMany).not.toHaveBeenCalled();
  });

  it("502s when the Stripe session can't be retrieved", async () => {
    stripeSessionsRetrieve.mockRejectedValue(new Error("network error"));
    const res = await POST(makeReq(), { params: Promise.resolve({ id: "order-1" }) });
    expect(res.status).toBe(502);
    expect(stripeRefundsCreate).not.toHaveBeenCalled();
  });
});
