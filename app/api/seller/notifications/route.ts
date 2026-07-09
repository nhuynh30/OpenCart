import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SELLER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [recentOrders, pendingCount, unreadMessages] = await Promise.all([
    prisma.order.findMany({
      where: { sellerId: session.user.id },
      include: { product: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.order.count({
      where: { sellerId: session.user.id, status: "PENDING" },
    }),
    prisma.message.count({
      where: {
        conversation: { sellerId: session.user.id },
        senderId: { not: session.user.id },
        readAt: null,
      },
    }),
  ]);

  return NextResponse.json({ orders: recentOrders, pendingCount, unreadMessages });
}
