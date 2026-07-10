import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { orderDeclinedHtml } from "@/lib/emails/orderDeclined";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SELLER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      buyer: { select: { email: true } },
      product: { include: { store: { select: { name: true } } } },
    },
  });
  if (!order || order.sellerId !== session.user.id) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.status !== "PAID") {
    return NextResponse.json({ error: "Only paid orders can be declined" }, { status: 422 });
  }
  if (!order.stripeSessionId) {
    return NextResponse.json({ error: "No payment on file for this order" }, { status: 422 });
  }

  // A cart checkout creates one Order row per product but they all share one
  // Stripe session — decline the whole group together, matching how shipping works.
  const groupWhere = { sellerId: session.user.id, stripeSessionId: order.stripeSessionId };
  const group = await prisma.order.findMany({
    where: groupWhere,
    include: { product: { select: { name: true } } },
  });

  if (group.some((o) => o.shippedAt)) {
    return NextResponse.json({ error: "Order already shipped — can't decline" }, { status: 409 });
  }
  if (group.some((o) => o.status === "REFUNDED")) {
    return NextResponse.json({ error: "Order already declined" }, { status: 409 });
  }

  let paymentIntentId: string | null = null;
  try {
    const stripeSession = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
    paymentIntentId =
      typeof stripeSession.payment_intent === "string"
        ? stripeSession.payment_intent
        : stripeSession.payment_intent?.id ?? null;
  } catch {
    return NextResponse.json({ error: "Could not look up payment on Stripe" }, { status: 502 });
  }

  if (!paymentIntentId) {
    return NextResponse.json({ error: "No payment intent found for this order" }, { status: 422 });
  }

  try {
    await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reverse_transfer: true,
      refund_application_fee: true,
    });
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? (err as { code?: string }).code : undefined;
    if (code !== "charge_already_refunded") {
      console.error("Decline/refund failed for order group", order.stripeSessionId, err);
      return NextResponse.json(
        { error: "We couldn't process the refund. Please try again in a moment." },
        { status: 502 }
      );
    }
    // The charge was already refunded on Stripe's side — likely a previous attempt
    // that succeeded there but never got recorded here (e.g. a dropped response).
    // Treat it as success and reconcile our records below instead of erroring forever.
  }

  const declinedAt = new Date();
  await prisma.order.updateMany({
    where: groupWhere,
    data: { status: "REFUNDED", declinedAt },
  });

  const amountTotal = group.reduce((sum, o) => sum + o.amountTotal, 0);

  await resend.emails.send({
    from: FROM_EMAIL,
    to: order.buyer.email,
    subject: group.length > 1
      ? `Your order was declined — ${group.length} items refunded`
      : `Your order was declined — ${order.product.name}`,
    html: orderDeclinedHtml({
      buyerEmail: order.buyer.email,
      items: group.map((o) => ({ productName: o.product.name, quantity: o.quantity })),
      storeName: order.product.store.name,
      amountTotal,
      orderId: order.id,
    }),
  }).catch(() => {
    // Non-critical — refund is already recorded even if the notification email fails
  });

  return NextResponse.json({ declined: group.length });
}
