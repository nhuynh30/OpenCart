import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ShoppingBag, MessageCircle, Inbox } from "lucide-react";

export const revalidate = 0;

export default async function MessagesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

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

  // Get unread counts per conversation
  const unreadCounts = await Promise.all(
    conversations.map((c) =>
      prisma.message.count({
        where: { conversationId: c.id, senderId: { not: userId }, readAt: null },
      })
    )
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <header className="bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black">
              <ShoppingBag className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold">OpenCart</span>
          </Link>
          <div className="flex items-center gap-3">
            {isSeller ? (
              <Link href="/seller/dashboard" className="text-xs text-gray-500 hover:text-gray-900">
                ← Dashboard
              </Link>
            ) : (
              <Link href="/orders" className="text-xs text-gray-500 hover:text-gray-900">
                My orders
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6 flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-gray-400" />
          <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
          <span className="ml-1 text-sm text-gray-400">
            {conversations.length === 0
              ? "No conversations yet"
              : `${conversations.length} conversation${conversations.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-20 text-center shadow-sm">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
              <Inbox className="h-6 w-6 text-gray-300" />
            </div>
            <p className="font-medium text-gray-500">No messages yet</p>
            <p className="mt-1 text-sm text-gray-400">
              {isSeller
                ? "When buyers ask questions about your products, they'll appear here."
                : "Ask a seller a question from any product page."}
            </p>
            {!isSeller && (
              <Link
                href="/"
                className="mt-5 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Browse products
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-50">
            {conversations.map((c, i) => {
              const lastMsg = c.messages[0];
              const unread = unreadCounts[i];
              const otherParty = isSeller ? c.buyer : c.seller;

              return (
                <Link
                  key={c.id}
                  href={`/messages/${c.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600">
                    {otherParty.email[0].toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm ${unread > 0 ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                        {otherParty.email}
                      </p>
                      {lastMsg && (
                        <span className="text-[11px] text-gray-400 shrink-0 ml-2">
                          {new Date(lastMsg.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400 truncate">
                      re: {c.product.name}
                    </p>
                    {lastMsg && (
                      <p className={`mt-0.5 truncate text-xs ${unread > 0 ? "font-medium text-gray-700" : "text-gray-400"}`}>
                        {lastMsg.body}
                      </p>
                    )}
                  </div>

                  {unread > 0 && (
                    <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
