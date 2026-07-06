import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/reviews — submit a review for a completed order
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "BUYER") {
    return NextResponse.json({ error: "Only buyers can leave reviews" }, { status: 403 });
  }

  const { orderId, rating, comment } = await req.json();

  if (!orderId || !rating) {
    return NextResponse.json({ error: "orderId and rating are required" }, { status: 400 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be 1–5" }, { status: 400 });
  }
  if (comment && comment.length > 1000) {
    return NextResponse.json({ error: "Comment too long (max 1000 characters)" }, { status: 400 });
  }

  // Verify the order belongs to this buyer and is PAID
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });
  if (!order || order.buyerId !== session.user.id) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.status !== "PAID") {
    return NextResponse.json({ error: "Can only review completed purchases" }, { status: 422 });
  }

  // One review per order (enforced by unique constraint on orderId)
  const existing = await prisma.review.findUnique({ where: { orderId } });
  if (existing) {
    return NextResponse.json({ error: "You already reviewed this order" }, { status: 409 });
  }

  const review = await prisma.review.create({
    data: {
      orderId,
      buyerId: session.user.id,
      sellerId: order.sellerId,
      productId: order.productId,
      rating,
      comment: comment?.trim() || null,
    },
  });

  return NextResponse.json({ review });
}
