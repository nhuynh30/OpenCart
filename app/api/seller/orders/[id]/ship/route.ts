import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { orderShippedHtml } from "@/lib/emails/orderShipped";

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
    return NextResponse.json({ error: "Only paid orders can be marked as shipped" }, { status: 422 });
  }

  // A cart checkout creates one Order row per product but they all share one
  // Stripe session — ship the whole group together, not just this one row.
  const groupWhere = order.stripeSessionId
    ? { sellerId: session.user.id, stripeSessionId: order.stripeSessionId }
    : { id: order.id };

  const group = await prisma.order.findMany({
    where: groupWhere,
    include: { product: { select: { name: true } } },
  });

  if (group.every((o) => o.shippedAt)) {
    return NextResponse.json({ error: "Order already marked as shipped" }, { status: 409 });
  }

  const shippedAt = new Date();
  await prisma.order.updateMany({
    where: { ...groupWhere, shippedAt: null },
    data: { shippedAt },
  });

  await resend.emails.send({
    from: FROM_EMAIL,
    to: order.buyer.email,
    subject: group.length > 1
      ? `Your order has shipped — ${group.length} items`
      : `Your order has shipped — ${order.product.name}`,
    html: orderShippedHtml({
      buyerEmail: order.buyer.email,
      items: group.map((o) => ({ productName: o.product.name, quantity: o.quantity })),
      storeName: order.product.store.name,
      orderId: order.id,
    }),
  }).catch(() => {
    // Non-critical — shipment is already recorded even if the notification email fails
  });

  return NextResponse.json({ shipped: group.length });
}
