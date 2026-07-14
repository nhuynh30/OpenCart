import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe, extractShippingAddress } from "@/lib/stripe";
import Link from "next/link";
import { ShoppingBag, PackageOpen, Truck, Clock, Ban } from "lucide-react";
import ReviewButton from "./ReviewButton";
import PurchaseSuccessToast from "./PurchaseSuccessToast";
import CartIcon from "@/app/components/CartIcon";
import { groupOrdersBySession } from "@/lib/orders";

export default async function OrderHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const { success } = await searchParams;

  // Reconcile every pending order against Stripe on each visit — not just the
  // latest one, and not gated behind ?success=true. Webhooks don't fire on
  // localhost, and a buyer may land here without completing the checkout
  // redirect (closed tab, back button, etc.), so this is the only backstop.
  const pendingOrders = await prisma.order.findMany({
    where: { buyerId: session.user.id, status: "PENDING", stripeSessionId: { not: null } },
    select: { id: true, stripeSessionId: true },
  });

  for (const pending of pendingOrders) {
    try {
      const stripeSession = await stripe.checkout.sessions.retrieve(pending.stripeSessionId!);
      if (stripeSession.payment_status === "paid") {
        await prisma.order.update({
          where: { id: pending.id },
          data: { status: "PAID", paidAt: new Date(), ...extractShippingAddress(stripeSession) },
        });
      } else if (stripeSession.status === "expired") {
        await prisma.order.update({
          where: { id: pending.id },
          data: { status: "FAILED" },
        });
      }
    } catch {
      // Skip orders whose session can't be retrieved — they'll be retried next visit
    }
  }

  const orders = await prisma.order.findMany({
    where: { buyerId: session.user.id, status: { in: ["PAID", "REFUNDED"] } },
    include: {
      product: { include: { store: { select: { id: true, name: true } } } },
      review: { select: { rating: true, comment: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // One checkout can create several Order rows (one per product) sharing a
  // Stripe session — group them back into a single order card.
  const groups = groupOrdersBySession(orders);

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      {/* Nav */}
      <header className="bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
          <Link href="/store" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black">
              <ShoppingBag className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold">OpenCart</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{session.user.email}</span>
            <CartIcon />
            <Link
              href="/messages"
              className="text-xs text-gray-500 hover:text-gray-900"
            >
              Messages
            </Link>
            <Link
              href="/store"
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
            >
              Browse store
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <PurchaseSuccessToast show={!!success} />

        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Your orders</h1>
          <p className="mt-0.5 text-sm text-gray-400">
            {groups.length === 0
              ? "No purchases yet"
              : `${groups.length} order${groups.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-20 text-center shadow-sm">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
              <PackageOpen className="h-6 w-6 text-gray-300" />
            </div>
            <p className="font-medium text-gray-500">No orders yet</p>
            <p className="mt-1 text-sm text-gray-400">
              Browse the store and make your first purchase.
            </p>
            <Link
              href="/store"
              className="mt-5 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => {
              const primary = group.items[0];
              const shippedDate = group.items
                .map((i) => i.shippedAt)
                .filter((d): d is Date => d !== null)
                .sort((a, b) => b.getTime() - a.getTime())[0];

              return (
                <div key={group.key} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-50 px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/stores/${primary.product.store.id}`}
                        className="text-sm font-medium text-gray-900 hover:underline"
                      >
                        {primary.product.store.name}
                      </Link>
                      <span className="text-xs text-gray-400">
                        {new Date(group.createdAt).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </span>
                    </div>
                    {group.status === "REFUNDED" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-600">
                        <Ban className="h-3 w-3" />
                        Declined & refunded
                      </span>
                    ) : group.allShipped ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700">
                        <Truck className="h-3 w-3" />
                        Shipped {shippedDate ? new Date(shippedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
                        <Clock className="h-3 w-3" />
                        Processing
                      </span>
                    )}
                  </div>

                  <div className="divide-y divide-gray-50">
                    {group.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 px-5 py-3.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-sm font-semibold text-indigo-500">
                          {item.product.name[0].toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {item.product.name}
                            {item.quantity > 1 && (
                              <span className="ml-1 text-gray-400">× {item.quantity}</span>
                            )}
                          </p>
                        </div>
                        <span className="w-20 shrink-0 text-right text-sm font-semibold text-gray-900">
                          ${(item.amountTotal / 100).toFixed(2)}
                        </span>
                        {group.status !== "REFUNDED" && (
                          <div className="shrink-0">
                            <ReviewButton
                              orderId={item.id}
                              productName={item.product.name}
                              existingReview={item.review}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {group.items.length > 1 && (
                    <div className="flex items-center justify-between border-t border-gray-50 bg-gray-50/50 px-5 py-2.5">
                      <span className="text-xs text-gray-400">Order total</span>
                      <span className="text-sm font-semibold text-gray-900">${(group.amountTotal / 100).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
