import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { orderConfirmationHtml } from "@/lib/emails/orderConfirmation";
import { newSaleNotificationHtml } from "@/lib/emails/newSaleNotification";

/**
 * @swagger
 * /api/webhooks/stripe:
 *   post:
 *     summary: Stripe webhook handler
 *     description: Handles Stripe webhook events. Updates order status on checkout.session.completed and checkout.session.expired. Deduplicates events using Redis.
 *     tags:
 *       - Webhooks
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid signature or missing webhook secret
 *       429:
 *         description: Too many requests — rate limit exceeded
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rateLimit = await checkRateLimit("webhooks-stripe", ip);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } }
    );
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Missing signature or webhook secret" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const dedupKey = `stripe:event:${event.id}`;
  const alreadyProcessed = await redis.get(dedupKey);

  if (alreadyProcessed) {
    return NextResponse.json({ received: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const orders = await prisma.order.findMany({
      where: { stripeSessionId: session.id },
      include: {
        buyer:   { select: { email: true } },
        seller:  { select: { email: true } },
        product: { include: { store: { select: { name: true } } } },
      },
    });

    await prisma.order.updateMany({
      where: { stripeSessionId: session.id },
      data: { status: "PAID" },
    });

    if (orders.length > 0) {
      const first = orders[0];
      const items = orders.map((o) => ({
        productName: o.product.name,
        quantity: o.quantity,
        amountTotal: o.amountTotal,
      }));
      const totalAmount = orders.reduce((s, o) => s + o.amountTotal, 0);
      const totalPlatformFee = orders.reduce((s, o) => s + o.platformFee, 0);

      await Promise.allSettled([
        resend.emails.send({
          from: FROM_EMAIL,
          to: first.buyer.email,
          subject: orders.length > 1
            ? `Your order is confirmed — ${orders.length} items`
            : `Your order is confirmed — ${first.product.name}`,
          html: orderConfirmationHtml({
            buyerEmail: first.buyer.email,
            items,
            totalAmount,
            sessionId: session.id,
            storeName: first.product.store.name,
          }),
        }),
        resend.emails.send({
          from: FROM_EMAIL,
          to: first.seller.email,
          subject: orders.length > 1
            ? `You made a sale — ${orders.length} items`
            : `You made a sale — ${first.product.name}`,
          html: newSaleNotificationHtml({
            sellerEmail: first.seller.email,
            buyerEmail: first.buyer.email,
            items,
            totalAmount,
            totalPlatformFee,
            sessionId: session.id,
          }),
        }),
      ]);
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;

    await prisma.order.updateMany({
      where: { stripeSessionId: session.id },
      data: { status: "FAILED" },
    });
  }

  await redis.set(dedupKey, "1", "EX", 86400);

  return NextResponse.json({ received: true });
}
