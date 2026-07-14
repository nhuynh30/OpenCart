import { describe, it, expect, vi, beforeEach } from "vitest";
import { FakeRedis } from "../../../../tests/fakeRedis";

const fakeRedis = new FakeRedis();
vi.mock("@/lib/redis", () => ({ redis: fakeRedis }));

const constructEvent = vi.fn();
vi.mock("@/lib/stripe", () => ({
  stripe: { webhooks: { constructEvent: (...args: unknown[]) => constructEvent(...args) } },
  extractShippingAddress: () => null,
}));

const prismaOrder = {
  findMany: vi.fn(),
  updateMany: vi.fn(),
};
vi.mock("@/lib/prisma", () => ({ prisma: { order: prismaOrder } }));

const emailsSend = vi.fn().mockResolvedValue({});
vi.mock("@/lib/resend", () => ({
  resend: { emails: { send: (...args: unknown[]) => emailsSend(...args) } },
  FROM_EMAIL: "test@opencart.dev",
}));
vi.mock("@/lib/emails/orderConfirmation", () => ({ orderConfirmationHtml: () => "<html/>" }));
vi.mock("@/lib/emails/newSaleNotification", () => ({ newSaleNotificationHtml: () => "<html/>" }));

const { POST } = await import("./route");

function makeReq(body: string, signature?: string) {
  const headers: Record<string, string> = {};
  if (signature) headers["stripe-signature"] = signature;
  return new Request("http://localhost/api/webhooks/stripe", { method: "POST", body, headers });
}

const fakeOrder = {
  id: "order-1",
  buyer: { email: "buyer@example.com" },
  seller: { email: "seller@example.com" },
  product: { name: "Widget", store: { name: "Test Store" } },
  quantity: 1,
  amountTotal: 5000,
  platformFee: 150,
};

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fakeRedis.reset();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  });

  it("rejects requests with no signature header", async () => {
    const res = await POST(makeReq("{}"));
    expect(res.status).toBe(400);
    expect(constructEvent).not.toHaveBeenCalled();
  });

  it("rejects requests when the webhook secret isn't configured", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const res = await POST(makeReq("{}", "t=1,v1=abc"));
    expect(res.status).toBe(400);
  });

  it("rejects an invalid signature", async () => {
    constructEvent.mockImplementation(() => {
      throw new Error("signature mismatch");
    });
    const res = await POST(makeReq("{}", "t=1,v1=bad"));
    expect(res.status).toBe(400);
    expect(prismaOrder.updateMany).not.toHaveBeenCalled();
  });

  it("marks orders PAID and emails buyer + seller on checkout.session.completed", async () => {
    constructEvent.mockReturnValue({
      id: "evt_1",
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_1" } },
    });
    prismaOrder.findMany.mockResolvedValue([fakeOrder]);

    const res = await POST(makeReq("{}", "t=1,v1=good"));
    expect(res.status).toBe(200);

    expect(prismaOrder.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripeSessionId: "cs_test_1" },
        data: expect.objectContaining({ status: "PAID" }),
      })
    );
    expect(emailsSend).toHaveBeenCalledTimes(2);
  });

  it("marks orders FAILED on checkout.session.expired", async () => {
    constructEvent.mockReturnValue({
      id: "evt_2",
      type: "checkout.session.expired",
      data: { object: { id: "cs_test_2" } },
    });

    const res = await POST(makeReq("{}", "t=1,v1=good"));
    expect(res.status).toBe(200);
    expect(prismaOrder.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripeSessionId: "cs_test_2" },
        data: { status: "FAILED" },
      })
    );
  });

  it("does not reprocess an event it has already seen (idempotency)", async () => {
    constructEvent.mockReturnValue({
      id: "evt_dup",
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_dup" } },
    });
    prismaOrder.findMany.mockResolvedValue([fakeOrder]);

    const first = await POST(makeReq("{}", "t=1,v1=good"));
    expect(first.status).toBe(200);
    expect(prismaOrder.updateMany).toHaveBeenCalledTimes(1);

    const second = await POST(makeReq("{}", "t=1,v1=good"));
    expect(second.status).toBe(200);
    // Still only called once total — the duplicate event was skipped.
    expect(prismaOrder.updateMany).toHaveBeenCalledTimes(1);
    expect(emailsSend).toHaveBeenCalledTimes(2); // from the first delivery only
  });
});
