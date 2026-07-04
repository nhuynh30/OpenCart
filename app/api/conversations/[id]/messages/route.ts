import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getConversationForUser(id: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id },
  });
  if (!conversation) return null;
  if (conversation.buyerId !== userId && conversation.sellerId !== userId) return null;
  return conversation;
}

// GET /api/conversations/[id]/messages — fetch messages and mark incoming as read
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const conversation = await getConversationForUser(id, session.user.id);
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Mark all messages from the other party as read
  await prisma.message.updateMany({
    where: {
      conversationId: id,
      senderId: { not: session.user.id },
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    include: { sender: { select: { id: true, email: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  const product = await prisma.product.findUnique({
    where: { id: conversation.productId },
    select: { id: true, name: true, imageUrl: true, price: true },
  });

  const otherParty =
    conversation.buyerId === session.user.id
      ? await prisma.user.findUnique({
          where: { id: conversation.sellerId },
          select: { id: true, email: true },
        })
      : await prisma.user.findUnique({
          where: { id: conversation.buyerId },
          select: { id: true, email: true },
        });

  return NextResponse.json({ messages, product, otherParty, conversation });
}

// POST /api/conversations/[id]/messages — send a message
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const conversation = await getConversationForUser(id, session.user.id);
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { body } = await req.json();
  if (!body?.trim()) {
    return NextResponse.json({ error: "Message body is required" }, { status: 400 });
  }
  if (body.length > 2000) {
    return NextResponse.json({ error: "Message too long (max 2000 characters)" }, { status: 400 });
  }

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId: id,
        senderId: session.user.id,
        body: body.trim(),
      },
      include: { sender: { select: { id: true, email: true, role: true } } },
    }),
    prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ message });
}
