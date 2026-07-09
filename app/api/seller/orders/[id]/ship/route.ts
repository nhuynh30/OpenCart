import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SELLER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.sellerId !== session.user.id) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.status !== "PAID") {
    return NextResponse.json({ error: "Only paid orders can be marked as shipped" }, { status: 422 });
  }
  if (order.shippedAt) {
    return NextResponse.json({ error: "Order already marked as shipped" }, { status: 409 });
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { shippedAt: new Date() },
  });

  return NextResponse.json({ order: updated });
}
