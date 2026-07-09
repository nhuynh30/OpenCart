import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Truck } from "lucide-react";
import SellerHeader from "../../SellerHeader";
import MarkShippedButton from "../MarkShippedButton";

const STATUS_CONFIG = {
  PAID:    { label: "Paid",    classes: "bg-emerald-50 text-emerald-700" },
  PENDING: { label: "Pending", classes: "bg-amber-50 text-amber-700" },
  FAILED:  { label: "Failed",  classes: "bg-red-50 text-red-700" },
} as const;

export const revalidate = 0;

export default async function SellerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SELLER") redirect("/store");

  const store = await prisma.store.findUnique({ where: { sellerId: session.user.id } });
  if (!store) redirect("/seller/store/create");

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      product: true,
      buyer: { select: { email: true } },
    },
  });

  if (!order || order.sellerId !== session.user.id) notFound();

  // A cart checkout creates one Order row per product but they all share one
  // Stripe session — show them together as a single order.
  const items = order.stripeSessionId
    ? await prisma.order.findMany({
        where: { sellerId: session.user.id, stripeSessionId: order.stripeSessionId },
        include: { product: true },
        orderBy: { createdAt: "asc" },
      })
    : [order];

  const s = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.PENDING;
  const amountTotal = items.reduce((sum, i) => sum + i.amountTotal, 0);
  const platformFee = items.reduce((sum, i) => sum + i.platformFee, 0);
  const payout = amountTotal - platformFee;
  const hasAddress = !!order.shippingLine1;
  const allShipped = items.every((i) => i.shippedAt !== null);
  const shippedDate = items
    .map((i) => i.shippedAt)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return (
    <div className="force-light min-h-screen bg-[#F1F5F9]">
      <SellerHeader storeName={store.name} storeId={store.id} email={session.user.email!} activeTab="Orders" />

      <main className="mx-auto max-w-3xl px-6 py-8">
        <Link
          href="/seller/orders"
          className="mb-4 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700"
        >
          ← Back to orders
        </Link>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Order <span className="font-mono">#{order.id.slice(0, 8)}</span>
            </h1>
            <p className="mt-0.5 text-sm text-gray-400">
              Placed {new Date(order.createdAt).toLocaleDateString("en-US", {
                month: "long", day: "numeric", year: "numeric",
              })}
            </p>
          </div>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${s.classes}`}>
            {s.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Product(s) */}
          <div className="col-span-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              {items.length > 1 ? `Products (${items.length})` : "Product"}
            </p>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-indigo-50 text-base font-semibold text-indigo-500">
                    {item.product.imageUrl && (item.product.imageUrl.startsWith("/uploads/") || item.product.imageUrl.startsWith("http")) ? (
                      <img src={item.product.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      item.product.name[0].toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                    <p className="text-xs text-gray-400">
                      Qty {item.quantity} · ${(item.amountTotal / item.quantity / 100).toFixed(2)} each
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment breakdown */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Payment</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Amount paid</span>
                <span className="font-medium text-gray-900">${(amountTotal / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Platform fee</span>
                <span className="text-gray-500">−${(platformFee / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2">
                <span className="font-medium text-gray-700">Your payout</span>
                <span className="font-semibold text-emerald-600">${(payout / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Buyer + fulfillment */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Buyer</p>
            <p className="text-sm text-gray-900">{order.buyer.email}</p>

            <p className="mb-3 mt-5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Fulfillment</p>
            {order.status !== "PAID" ? (
              <span className="text-sm text-gray-400">Waiting on payment</span>
            ) : allShipped ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                <Truck className="h-3.5 w-3.5" />
                Shipped {shippedDate ? new Date(shippedDate).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                }) : ""}
              </span>
            ) : (
              <MarkShippedButton orderId={order.id} />
            )}
          </div>

          {/* Shipping address */}
          <div className="col-span-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Ship to</p>
            {hasAddress ? (
              <div className="text-sm leading-relaxed text-gray-700">
                <p className="font-medium">{order.shippingName}</p>
                <p>{order.shippingLine1}{order.shippingLine2 ? `, ${order.shippingLine2}` : ""}</p>
                <p>{order.shippingCity}, {order.shippingState} {order.shippingPostalCode}</p>
                <p>{order.shippingCountry}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">No shipping address on file yet.</p>
            )}
          </div>

          {/* Payment reference */}
          {order.stripeSessionId && (
            <div className="col-span-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Payment reference</p>
              <p className="rounded-lg bg-gray-50 px-3 py-2 font-mono text-xs text-gray-500">{order.stripeSessionId}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
