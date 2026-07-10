import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { redis } from "@/lib/redis";
import Link from "next/link";
import { Plus, ExternalLink, TrendingUp, ShoppingBag } from "lucide-react";
import SignOutButton from "./SignOutButton";
import OrderFilters from "./OrderFilters";
import SyncOrdersButton from "./SyncOrdersButton";
import SellerHeader from "../SellerHeader";
import ShareButton from "../ShareButton";

export const revalidate = 60;

export default async function SellerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const { status } = await searchParams;

  const store = await prisma.store.findUnique({
    where: { sellerId: session.user.id },
  });

  if (!store) redirect("/seller/store/create");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthName = now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const statusFilter =
    status === "PAID" ? "PAID" : status === "PENDING" ? "PENDING" : undefined;

  const [seller, allPaidOrders, ordersThisMonth, activeListings, recentOrders, products] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { stripeAccountId: true, stripeOnboarded: true },
      }),
      prisma.order.findMany({
        where: { sellerId: session.user.id, status: "PAID" },
        select: { amountTotal: true, platformFee: true, createdAt: true },
      }),
      prisma.order.count({
        where: {
          sellerId: session.user.id,
          status: "PAID",
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.product.count({
        where: { storeId: store.id, active: true },
      }),
      prisma.order.findMany({
        where: {
          sellerId: session.user.id,
          ...(statusFilter ? { status: statusFilter } : {}),
        },
        include: { product: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.product.findMany({
        where: { storeId: store.id, active: true },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, price: true, category: true },
      }),
    ]);

  const totalRevenue = allPaidOrders.reduce((sum, o) => sum + o.amountTotal, 0);
  const isTestMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ?? false;

  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thisMonthRevenue = allPaidOrders
    .filter((o) => o.createdAt >= startOfMonth)
    .reduce((sum, o) => sum + o.amountTotal, 0);
  const lastMonthRevenue = allPaidOrders
    .filter((o) => o.createdAt >= startOfLastMonth && o.createdAt < startOfMonth)
    .reduce((sum, o) => sum + o.amountTotal, 0);
  const revenueChangePct =
    lastMonthRevenue > 0
      ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : thisMonthRevenue > 0
      ? null // no baseline to compare against — treat as "new"
      : 0;

  // W3-2: fetch real Stripe balance, cached in Redis for 5 min
  let availablePayout = 0;
  let pendingPayout = 0;
  let nextPayoutDate: string | null = null;

  if (seller?.stripeAccountId && seller.stripeOnboarded) {
    const cacheKey = `stripe:balance:${seller.stripeAccountId}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      const parsed = JSON.parse(cached);
      availablePayout = parsed.available;
      pendingPayout = parsed.pending;
      nextPayoutDate = parsed.nextPayoutDate;
    } else {
      try {
        const [balance, payouts] = await Promise.all([
          stripe.balance.retrieve({}, { stripeAccount: seller.stripeAccountId }),
          stripe.payouts.list({ limit: 1, status: "pending" }, { stripeAccount: seller.stripeAccountId }),
        ]);
        availablePayout = Math.max(0, balance.available.reduce((sum, b) => sum + b.amount, 0));
        pendingPayout = Math.max(0, balance.pending.reduce((sum, b) => sum + b.amount, 0));
        nextPayoutDate = payouts.data[0]?.arrival_date
          ? new Date(payouts.data[0].arrival_date * 1000).toLocaleDateString("en-US", {
              month: "short", day: "numeric",
            })
          : null;
        await redis.setex(cacheKey, 60, JSON.stringify({ available: availablePayout, pending: pendingPayout, nextPayoutDate }));
      } catch {
        // fall back to DB calculation if Stripe call fails
        availablePayout = allPaidOrders.reduce((sum, o) => sum + o.amountTotal - o.platformFee, 0);
      }
    }
  } else {
    availablePayout = allPaidOrders.reduce((sum, o) => sum + o.amountTotal - o.platformFee, 0);
  }

  const statusConfig: Record<string, { label: string; classes: string }> = {
    PAID: {
      label: "Paid",
      classes: "bg-emerald-50 text-emerald-700",
    },
    PENDING: {
      label: "Pending",
      classes: "bg-amber-50 text-amber-700",
    },
    FAILED: {
      label: "Failed",
      classes: "bg-red-50 text-red-700",
    },
  };

  return (
    <div className="force-light flex h-screen flex-col overflow-hidden bg-[#F1F5F9]">
      <SellerHeader storeName={store.name} storeId={store.id} email={session.user.email!} activeTab="Overview" />

      {!seller?.stripeOnboarded && (
        <div className="flex shrink-0 items-center justify-between border-b border-amber-100 bg-amber-50 px-6 py-2.5">
          <p className="text-sm text-amber-800">
            <span className="font-medium">Connect Stripe</span> to start accepting payments and receiving payouts.
          </p>
          <Link
            href="/seller/onboarding"
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
          >
            Connect Stripe
          </Link>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — white bg, no border, shadow separates it */}
        <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-r border-gray-100 bg-white">
          {/* Balance */}
          <div className="border-b border-gray-100 p-5 pb-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Balance
              </span>
              <span
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  isTestMode ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isTestMode ? "bg-amber-500" : "bg-emerald-500"}`} />
                {isTestMode ? "Stripe test mode" : "Stripe live"}
              </span>
            </div>
            <div className="rounded-xl bg-[#0F172A] p-4 text-white">
              <p className="text-xs text-white/40">💳 Available to pay out</p>
              <p className="mt-1 text-3xl font-medium text-white">
                ${(availablePayout / 100).toFixed(2)}
              </p>
              {pendingPayout > 0 && (
                <p className="mt-0.5 text-xs text-white/30" title="Stripe settles funds in 2–7 business days before they become available to pay out.">
                  ${(pendingPayout / 100).toFixed(2)} settling · 2–7 days
                </p>
              )}
              <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3">
                <div className="flex justify-between">
                  <span className="text-xs text-white/40">Platform fee</span>
                  <span className="text-xs font-medium text-white/80">3%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-white/40">You keep</span>
                  <span className="text-xs font-medium text-emerald-400">97%</span>
                </div>
                {nextPayoutDate && (
                  <div className="flex justify-between">
                    <span className="text-xs text-white/40">Next payout</span>
                    <span className="text-xs font-medium text-white/80">{nextPayoutDate}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="border-b border-gray-100 px-5 pb-4 pt-2">
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-gray-400">
              Quick Actions
            </p>
            <div className="space-y-0.5">
              <Link
                href="/seller/products/new"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                <Plus className="h-4 w-4 text-gray-400" />
                Add product
                <ExternalLink className="ml-auto h-3.5 w-3.5 text-gray-300" />
              </Link>
              <Link
                href="/store"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                <ExternalLink className="h-4 w-4 text-gray-400" />
                View storefront
                <ExternalLink className="ml-auto h-3.5 w-3.5 text-gray-300" />
              </Link>
              <ShareButton storeId={store.id} />
              <SyncOrdersButton />
            </div>
          </div>

          {/* Your Listings */}
          <div className="px-5 pb-4 pt-2">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Your Listings
              </p>
              <Link
                href="/seller/products"
                className="text-xs font-medium text-indigo-500 hover:text-indigo-700"
              >
                See all
              </Link>
            </div>
            <div className="space-y-0.5">
              {products.length === 0 ? (
                <p className="px-2 py-1.5 text-sm text-gray-400">
                  No active listings yet.
                </p>
              ) : (
                products.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-gray-50"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-sm font-semibold text-indigo-500">
                      {product.name[0].toUpperCase()}
                    </div>
                    <span className="flex-1 truncate text-sm font-medium text-gray-700">
                      {product.name}
                    </span>
                    <span className="shrink-0 text-sm text-gray-500">
                      ${(product.price / 100).toFixed(0)}
                    </span>
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                  </div>
                ))
              )}
              {activeListings > 5 && (
                <button className="flex w-full items-center justify-center gap-1 rounded-lg py-2 text-xs text-gray-400 hover:bg-gray-50">
                  + {activeListings - 5} more listings
                </button>
              )}
            </div>
          </div>

          <div className="mt-auto p-3">
            <SignOutButton />
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto px-6 py-5">
          {/* Greeting */}
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h1 className="text-xl font-medium text-gray-900">
                {greeting}, {store.name}
              </h1>
              <p className="mt-0.5 text-sm font-normal text-gray-400">
                Here&apos;s what&apos;s happening with your store today.
              </p>
            </div>
            <Link
              href="/seller/products/new"
              className="flex items-center gap-1.5 rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Add product
            </Link>
          </div>

          {/* Stats */}
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
              <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-xl bg-emerald-400" />
              <div className="flex items-start justify-between">
                <p className="text-xs text-gray-400">
                  Revenue &middot;{" "}
                  <span className="text-gray-500">all time</span>
                </p>
                {revenueChangePct !== 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      revenueChangePct === null || revenueChangePct >= 0
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {revenueChangePct === null
                      ? "New"
                      : `${revenueChangePct >= 0 ? "+" : ""}${revenueChangePct}%`}
                  </span>
                )}
              </div>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                ${(totalRevenue / 100).toFixed(2)}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                {allPaidOrders.length === 0
                  ? "No sales yet"
                  : `${allPaidOrders.length} paid orders`}
              </p>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
              <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-xl bg-blue-400" />
              <p className="text-xs text-gray-400">
                Orders &middot;{" "}
                <span className="text-gray-500">this month</span>
              </p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {ordersThisMonth}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">{monthName}</p>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
              <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-xl bg-violet-400" />
              <p className="text-xs text-gray-400">Active listings</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {activeListings}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                <TrendingUp className="h-3 w-3" />
                Products live
              </p>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-gray-900">
                  Recent orders
                </h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                  {recentOrders.length} orders
                </span>
              </div>
              <div className="flex items-center gap-3">
                <OrderFilters currentStatus={status} />
                <Link
                  href="/seller/orders"
                  className="text-xs font-medium text-indigo-500 hover:text-indigo-700"
                >
                  View all →
                </Link>
              </div>
            </div>

            {recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                  <ShoppingBag className="h-5 w-5 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-500">No orders yet</p>
                <p className="mt-1 text-xs text-gray-400">
                  Share your store link to get your first sale.
                </p>
                <ShareButton storeId={store.id} />
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      Order
                    </th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      Product
                    </th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      Amount
                    </th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      Status
                    </th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentOrders.map((order) => {
                    const s = statusConfig[order.status] ?? statusConfig.PENDING;
                    return (
                      <tr key={order.id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3">
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-500">
                            #{order.id.slice(0, 8)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm font-medium text-gray-900">
                          {order.product.name}
                        </td>
                        <td className="px-5 py-3 text-sm font-semibold text-gray-900">
                          ${(order.amountTotal / 100).toFixed(2)}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${s.classes}`}
                          >
                            {s.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric", year: "numeric" }
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
