import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pendingOrders = await prisma.order.findMany({
    where: {
      sellerId: session.user.id,
      status: "PENDING",
      stripeSessionId: { not: null },
    },
    select: { id: true, stripeSessionId: true },
  });

  if (pendingOrders.length === 0) {
    return NextResponse.json({ synced: 0 });
  }

  let synced = 0;

  for (const order of pendingOrders) {
    try {
      const stripeSession = await stripe.checkout.sessions.retrieve(
        order.stripeSessionId!
      );

      if (stripeSession.payment_status === "paid") {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "PAID" },
        });
        synced++;
      } else if (stripeSession.status === "expired") {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "FAILED" },
        });
      }
    } catch {
      // skip orders whose session can't be retrieved
    }
  }

  return NextResponse.json({ synced, total: pendingOrders.length });
}
