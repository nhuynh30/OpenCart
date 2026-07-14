import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import SellerHeader from "../SellerHeader";
import MarkShippedButton from "./MarkShippedButton";
import DeclineOrderButton from "./DeclineOrderButton";
import { groupOrdersBySession } from "@/lib/orders";

const STATUS_CONFIG = {
  PAID:     { label: "Paid",     classes: "bg-emerald-50 text-emerald-700" },
  PENDING:  { label: "Unpaid",   classes: "bg-amber-50 text-amber-700" },
  FAILED:   { label: "Failed",   classes: "bg-red-50 text-red-700" },
  REFUNDED: { label: "Refunded", classes: "bg-gray-100 text-gray-600" },
} as const;

export const revalidate = 0;

export default async function SellerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SELLER") redirect("/store");

  const store = await prisma.store.findUnique({ where: { sellerId: session.user.id } });
  if (!store) redirect("/seller/store/create");

  const { status } = await searchParams;
  const statusFilter =
    status === "PAID" ? "PAID" :
    status === "PENDING" ? "PENDING" :
    status === "FAILED" ? "FAILED" :
    status === "REFUNDED" ? "REFUNDED" :
    undefined;

  const [orders, allOrdersForCounts] = await Promise.all([
    prisma.order.findMany({
      where: {
        sellerId: session.user.id,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findMany({
      where: { sellerId: session.user.id },
      select: {
        id: true, stripeSessionId: true, status: true,
        amountTotal: true, platformFee: true, shippedAt: true, createdAt: true,
      },
    }),
  ]);

  const groups = groupOrdersBySession(orders);

  // Tab counts reflect grouped orders, not raw line-item rows, so they stay
  // consistent with what the table below actually shows.
  const allGroups = groupOrdersBySession(allOrdersForCounts);
  const countMap: Record<string, number> = {};
  for (const g of allGroups) countMap[g.status] = (countMap[g.status] ?? 0) + 1;
  const total = allGroups.length;

  const tabs = [
    { label: "All",     value: undefined,   count: total },
    { label: "Paid",    value: "PAID",      count: countMap.PAID ?? 0 },
    { label: "Unpaid",  value: "PENDING",   count: countMap.PENDING ?? 0 },
    { label: "Failed",  value: "FAILED",    count: countMap.FAILED ?? 0 },
    { label: "Refunded", value: "REFUNDED", count: countMap.REFUNDED ?? 0 },
  ];

  return (
    <div className="force-light min-h-screen bg-[#F1F5F9]">
      <SellerHeader storeName={store.name} storeId={store.id} email={session.user.email!} activeTab="Orders" />

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
          <p className="mt-0.5 text-sm text-gray-400">{total} total orders across all products</p>
        </div>

        {/* Status tabs */}
        <div className="mb-4 flex items-center gap-1">
          {tabs.map((tab) => {
            const isActive = statusFilter === tab.value;
            const href = tab.value ? `/seller/orders?status=${tab.value}` : "/seller/orders";
            return (
              <a
                key={tab.label}
                href={href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  isActive
                    ? "bg-white font-medium text-gray-900 shadow-sm ring-1 ring-gray-200"
                    : "text-gray-500 hover:bg-white/60 hover:text-gray-700"
                }`}
              >
                {tab.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                  isActive ? "bg-gray-100 text-gray-600" : "bg-gray-100/80 text-gray-400"
                }`}>
                  {tab.count}
                </span>
              </a>
            );
          })}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {groups.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-sm font-medium text-gray-500">No orders{statusFilter ? ` with status "${statusFilter}"` : ""}</p>
              <p className="mt-1 text-xs text-gray-400">Orders will appear here once buyers make purchases.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">Order ID</th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">Product</th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">Amount</th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">Your cut</th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">Fulfillment</th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">Ship to</th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {groups.map((group) => {
                  const s = STATUS_CONFIG[group.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.PENDING;
                  const payout = group.amountTotal - group.platformFee;
                  const primary = group.items[0];
                  const needsShipping = group.status === "PAID" && !group.allShipped;
                  const shippedDate = group.items
                    .map((o) => o.shippedAt)
                    .filter((d): d is Date => d !== null)
                    .sort((a, b) => b.getTime() - a.getTime())[0];

                  return (
                    <tr key={group.key} className={needsShipping ? "bg-amber-50/60 hover:bg-amber-50" : "hover:bg-gray-50/50"}>
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/seller/orders/${primary.id}`}
                          className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                        >
                          #{primary.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-semibold text-indigo-500">
                            {primary.product.name[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="block max-w-[180px] truncate text-sm font-medium text-gray-900">
                              {primary.product.name}
                            </span>
                            {group.items.length > 1 && (
                              <span className="text-xs text-gray-400">+{group.items.length - 1} more item{group.items.length > 2 ? "s" : ""}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">
                        ${(group.amountTotal / 100).toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-medium text-emerald-600">
                        ${(payout / 100).toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${s.classes}`}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {group.status !== "PAID" ? (
                          <span className="text-xs text-gray-300">—</span>
                        ) : group.allShipped ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700">
                            Shipped {shippedDate ? new Date(shippedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <MarkShippedButton orderId={primary.id} />
                            <DeclineOrderButton orderId={primary.id} />
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-500">
                        {group.status === "PAID" && primary.shippingLine1 ? (
                          <div className="max-w-[160px]">
                            <p className="font-medium text-gray-700">{primary.shippingName}</p>
                            <p>{primary.shippingLine1}{primary.shippingLine2 ? `, ${primary.shippingLine2}` : ""}</p>
                            <p>{primary.shippingCity}, {primary.shippingState} {primary.shippingPostalCode}</p>
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-400">
                        {new Date(group.createdAt).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
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
  );
}
