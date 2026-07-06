import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import MessageThread from "./MessageThread";

export const revalidate = 0;

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = session.user.id;

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      product: { select: { id: true, name: true, imageUrl: true, price: true } },
      buyer: { select: { id: true, email: true } },
      seller: { select: { id: true, email: true } },
    },
  });

  if (!conversation) notFound();
  if (conversation.buyerId !== userId && conversation.sellerId !== userId) notFound();

  const isSeller = session.user.role === "SELLER";
  const otherParty = isSeller ? conversation.buyer : conversation.seller;

  // Load initial messages and mark as read
  await prisma.message.updateMany({
    where: { conversationId: id, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  });

  const initialMessages = await prisma.message.findMany({
    where: { conversationId: id },
    include: { sender: { select: { id: true, email: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex h-screen flex-col bg-[#F1F5F9]">
      {/* Header */}
      <header className="shrink-0 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black">
                <ShoppingBag className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold">OpenCart</span>
            </Link>
            <span className="text-gray-300">/</span>
            <Link href="/messages" className="text-sm text-gray-500 hover:text-gray-900">
              Messages
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-medium text-gray-900">{otherParty.email}</span>
          </div>
          <Link href="/messages" className="text-xs text-gray-400 hover:text-gray-700">
            ← Back to inbox
          </Link>
        </div>
      </header>

      {/* Product context strip */}
      <div className="shrink-0 border-b border-gray-100 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm font-semibold text-gray-500">
            {conversation.product.name[0].toUpperCase()}
          </div>
          <div>
            <p className="text-xs text-gray-400">Question about</p>
            <Link
              href={`/products/${conversation.product.id}`}
              className="text-sm font-medium text-gray-900 hover:text-indigo-600 hover:underline"
            >
              {conversation.product.name} · ${(conversation.product.price / 100).toFixed(2)}
            </Link>
          </div>
        </div>
      </div>

      {/* Thread */}
      <MessageThread
        conversationId={id}
        currentUserId={userId}
        initialMessages={initialMessages.map((m) => ({
          id: m.id,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
          sender: { id: m.sender.id, email: m.sender.email, role: m.sender.role },
        }))}
      />
    </div>
  );
}
