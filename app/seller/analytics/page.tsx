import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SellerHeader from "../SellerHeader";

export const revalidate = 60;

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex h-40 items-end gap-2">
      {data.map((d) => {
        const pct = (d.value / max) * 100;
        return (
          <div key={d.label} className="group flex flex-1 flex-col items-center gap-1">
            <div className="relative w-full" style={{ height: "120px" }}>
              <div
                className="absolute bottom-0 w-full rounded-t-md bg-indigo-500 transition-all group-hover:bg-indigo-600"
                style={{ height: `${Math.max(pct, 2)}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-400">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default async function SellerAnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SELLER") redirect("/");

  const store = await prisma.store.findUnique({ where: { sellerId: session.user.id } });
  if (!store) redirect("/seller/store/create");

  const paidOrders = await prisma.order.findMany({
    where: { sellerId: session.user.id, status: "PAID" },
    include: { product: true },
    orderBy: { createdAt: "asc" },
  });

  const allOrders = await prisma.order.findMany({
    where: { sellerId: session.user.id },
    select: { status: true },
  });

  // Revenue metrics
  const totalRevenue = paidOrders.reduce((s, o) => s + o.amountTotal, 0);
  const totalPayout  = paidOrders.reduce((s, o) => s + o.amountTotal - o.platformFee, 0);
  const avgOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

  // Monthly revenue — last 6 months
  const now = new Date();
  const months: { label: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("en-US", { month: "short" });
    const value = paidOrders
      .filter((o) => {
        const od = new Date(o.createdAt);
        return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth();
      })
      .reduce((s, o) => s + o.amountTotal, 0);
    months.push({ label, value });
  }

  // Top products by revenue
  const productMap: Record<string, { name: string; revenue: number; orders: number }> = {};
  for (const o of paidOrders) {
    if (!productMap[o.productId]) {
      productMap[o.productId] = { name: o.product.name, revenue: 0, orders: 0 };
    }
    productMap[o.productId].revenue += o.amountTotal;
    productMap[o.productId].orders  += 1;
  }
  const topProducts = Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Orders by status
  const statusCounts = { PAID: 0, PENDING: 0, FAILED: 0 } as Record<string, number>;
  for (const o of allOrders) statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;

  const activeProducts = await prisma.product.count({ where: { storeId: store.id, active: true } });

  return (
    <div className="force-light min-h-screen bg-[#F1F5F9]">
      <SellerHeader storeName={store.name} storeId={store.id} email={session.user.email!} activeTab="Analytics" />

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
          <p className="mt-0.5 text-sm text-gray-400">Your store performance overview</p>
        </div>

        {/* Stat cards */}
        <div className="mb-6 grid grid-cols-4 gap-4">
          {[
            { label: "Total revenue",    value: `$${(totalRevenue / 100).toFixed(2)}`,  sub: "All time, gross" },
            { label: "Your payout",      value: `$${(totalPayout / 100).toFixed(2)}`,   sub: "After 3% fee" },
            { label: "Paid orders",      value: paidOrders.length.toString(),            sub: `${allOrders.length} total orders` },
            { label: "Avg order value",  value: `$${(avgOrderValue / 100).toFixed(2)}`, sub: `${activeProducts} active products` },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-xs text-gray-400">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{card.value}</p>
              <p className="mt-0.5 text-xs text-gray-400">{card.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Revenue chart */}
          <div className="col-span-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Monthly revenue</p>
                <p className="text-xs text-gray-400">Last 6 months</p>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                ${(totalRevenue / 100).toFixed(2)}
              </span>
            </div>
            {paidOrders.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-gray-300">
                No sales data yet
              </div>
            ) : (
              <BarChart data={months} />
            )}
          </div>

          {/* Order status breakdown */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="mb-4 text-sm font-semibold text-gray-900">Order breakdown</p>
            <div className="space-y-3">
              {[
                { label: "Paid",    key: "PAID",    color: "bg-emerald-400", text: "text-emerald-700", bg: "bg-emerald-50" },
                { label: "Pending", key: "PENDING", color: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50" },
                { label: "Failed",  key: "FAILED",  color: "bg-red-400",     text: "text-red-700",     bg: "bg-red-50" },
              ].map((s) => {
                const count = statusCounts[s.key] ?? 0;
                const pct = allOrders.length > 0 ? Math.round((count / allOrders.length) * 100) : 0;
                return (
                  <div key={s.key}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${s.bg} ${s.text}`}>
                        {s.label}
                      </span>
                      <span className="text-xs text-gray-500">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className={`h-full rounded-full ${s.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 border-t border-gray-100 pt-4">
              <p className="mb-1 text-xs text-gray-400">Total orders</p>
              <p className="text-2xl font-semibold text-gray-900">{allOrders.length}</p>
            </div>
          </div>
        </div>

        {/* Top products */}
        {topProducts.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4">
              <p className="text-sm font-semibold text-gray-900">Top products by revenue</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50">
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">#</th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">Product</th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">Orders</th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">Revenue</th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topProducts.map((p, i) => {
                  const share = totalRevenue > 0 ? Math.round((p.revenue / totalRevenue) * 100) : 0;
                  return (
                    <tr key={p.name} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 text-sm font-medium text-gray-400">#{i + 1}</td>
                      <td className="px-5 py-3 text-sm font-medium text-gray-900">{p.name}</td>
                      <td className="px-5 py-3 text-sm text-gray-500">{p.orders}</td>
                      <td className="px-5 py-3 text-sm font-semibold text-gray-900">${(p.revenue / 100).toFixed(2)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
                            <div className="h-full rounded-full bg-indigo-400" style={{ width: `${share}%` }} />
                          </div>
                          <span className="text-xs text-gray-400">{share}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
