import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/conversations — list all conversations for the current user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const isSeller = session.user.role === "SELLER";

  const conversations = await prisma.conversation.findMany({
    where: isSeller ? { sellerId: userId } : { buyerId: userId },
    include: {
      product: { select: { id: true, name: true, imageUrl: true } },
      buyer: { select: { id: true, email: true } },
      seller: { select: { id: true, email: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Attach unread count per conversation (messages from the other party not yet read)
  const withUnread = await Promise.all(
    conversations.map(async (c) => {
      const unread = await prisma.message.count({
        where: {
          conversationId: c.id,
          senderId: { not: userId },
          readAt: null,
        },
      });
      return { ...c, unreadCount: unread };
    })
  );

  return NextResponse.json({ conversations: withUnread });
}

// POST /api/conversations — find or create a conversation for buyer+seller+product
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only buyers can initiate conversations
  if (session.user.role !== "BUYER") {
    return NextResponse.json({ error: "Only buyers can start conversations" }, { status: 403 });
  }

  const { productId, sellerId } = await req.json();
  if (!productId || !sellerId) {
    return NextResponse.json({ error: "productId and sellerId are required" }, { status: 400 });
  }

  // Verify product exists and belongs to this seller
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { store: { select: { sellerId: true } } },
  });
  if (!product || product.store.sellerId !== sellerId) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const conversation = await prisma.conversation.upsert({
    where: {
      buyerId_sellerId_productId: {
        buyerId: session.user.id,
        sellerId,
        productId,
      },
    },
    create: {
      buyerId: session.user.id,
      sellerId,
      productId,
    },
    update: {},
  });

  return NextResponse.json({ conversation });
}
