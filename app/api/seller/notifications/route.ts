import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SELLER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const seller = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { notificationsSeenAt: true },
  });

  const [recentOrders, newSalesCount, unreadMessages] = await Promise.all([
    prisma.order.findMany({
      where: { sellerId: session.user.id },
      include: { product: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.order.count({
      where: {
        sellerId: session.user.id,
        status: "PAID",
        paidAt: seller?.notificationsSeenAt ? { gt: seller.notificationsSeenAt } : { not: null },
      },
    }),
    prisma.message.count({
      where: {
        conversation: { sellerId: session.user.id },
        senderId: { not: session.user.id },
        readAt: null,
      },
    }),
  ]);

  return NextResponse.json({ orders: recentOrders, newSalesCount, unreadMessages });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SELLER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { notificationsSeenAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
