import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ShoppingBag, PackageOpen } from "lucide-react";
import AccessButton from "./AccessButton";
import ReviewButton from "./ReviewButton";

export default async function OrderHistoryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const orders = await prisma.order.findMany({
    where: { buyerId: session.user.id, status: "PAID" },
    include: {
      product: { include: { store: { select: { id: true, name: true } } } },
      review: { select: { rating: true, comment: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      {/* Nav */}
      <header className="bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black">
              <ShoppingBag className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold">OpenCart</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{session.user.email}</span>
            <Link
              href="/messages"
              className="text-xs text-gray-500 hover:text-gray-900"
            >
              Messages
            </Link>
            <Link
              href="/"
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
            >
              Browse store
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Your orders</h1>
          <p className="mt-0.5 text-sm text-gray-400">
            {orders.length === 0
              ? "No purchases yet"
              : `${orders.length} paid order${orders.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-20 text-center shadow-sm">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
              <PackageOpen className="h-6 w-6 text-gray-300" />
            </div>
            <p className="font-medium text-gray-500">No orders yet</p>
            <p className="mt-1 text-sm text-gray-400">
              Browse the store and make your first purchase.
            </p>
            <Link
              href="/"
              className="mt-5 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Product
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Store
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Amount
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Date
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Review
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-sm font-semibold text-indigo-500">
                          {order.product.name[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {order.product.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/stores/${order.product.store.id}`}
                        className="text-sm text-gray-500 hover:text-gray-900 hover:underline"
                      >
                        {order.product.store.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">
                      ${(order.amountTotal / 100).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3.5">
                      <ReviewButton
                        orderId={order.id}
                        productName={order.product.name}
                        existingReview={order.review}
                      />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <AccessButton productName={order.product.name} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
