import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { redis } from "@/lib/redis";
import SellerHeader from "../SellerHeader";
import Link from "next/link";
import ClearBalanceButton from "./ClearBalanceButton";
import PayoutNowButton from "./PayoutNowButton";

export const revalidate = 0;

export default async function SellerPayoutsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SELLER") redirect("/");

  const store = await prisma.store.findUnique({ where: { sellerId: session.user.id } });
  if (!store) redirect("/seller/store/create");

  const seller = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stripeAccountId: true, stripeOnboarded: true },
  });

  let available = 0;
  let pending   = 0;
  let nextPayoutDate: string | null = null;
  let payoutHistory: {
    id: string;
    amount: number;
    status: string;
    arrivalDate: string;
    currency: string;
  }[] = [];
  let currency = "usd";
  let payoutSchedule: string | null = null;

  if (seller?.stripeAccountId && seller.stripeOnboarded) {
    const cacheKey = `stripe:balance:${seller.stripeAccountId}`;
    const cached   = await redis.get(cacheKey);

    if (cached) {
      const p = JSON.parse(cached);
      available     = p.available;
      pending       = p.pending;
      nextPayoutDate = p.nextPayoutDate;
    } else {
      try {
        const [balance, upcomingPayouts] = await Promise.all([
          stripe.balance.retrieve({}, { stripeAccount: seller.stripeAccountId }),
          stripe.payouts.list({ limit: 1, status: "pending" }, { stripeAccount: seller.stripeAccountId }),
        ]);
        available  = Math.max(0, balance.available.reduce((s, b) => s + b.amount, 0));
        pending    = Math.max(0, balance.pending.reduce((s, b) => s + b.amount, 0));
        currency   = balance.available[0]?.currency ?? "usd";
        nextPayoutDate = upcomingPayouts.data[0]?.arrival_date
          ? new Date(upcomingPayouts.data[0].arrival_date * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
          : null;
        await redis.setex(cacheKey, 60, JSON.stringify({ available, pending, nextPayoutDate }));
      } catch { /* Stripe call failed */ }
    }

    try {
      const account = await stripe.accounts.retrieve(seller.stripeAccountId);
      const sched   = account.settings?.payouts?.schedule;
      if (sched?.interval === "daily")   payoutSchedule = "Daily automatic payouts";
      else if (sched?.interval === "weekly")  payoutSchedule = `Weekly — every ${sched.weekly_anchor}`;
      else if (sched?.interval === "monthly") payoutSchedule = `Monthly — on the ${sched.monthly_anchor}th`;
      else if (sched?.interval === "manual")  payoutSchedule = "Manual payouts only";
    } catch { /* ignore */ }

    try {
      const payouts = await stripe.payouts.list({ limit: 10 }, { stripeAccount: seller.stripeAccountId });
      payoutHistory = payouts.data.map((p) => ({
        id:          p.id,
        amount:      p.amount,
        status:      p.status,
        arrivalDate: new Date(p.arrival_date * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        currency:    p.currency,
      }));
    } catch { /* ignore */ }
  }

  const paidOrders = await prisma.order.findMany({
    where: { sellerId: session.user.id, status: "PAID" },
    select: { amountTotal: true, platformFee: true },
  });
  const lifetimeRevenue = paidOrders.reduce((s, o) => s + o.amountTotal, 0);
  const lifetimePayout  = paidOrders.reduce((s, o) => s + o.amountTotal - o.platformFee, 0);

  const statusConfig: Record<string, { label: string; classes: string }> = {
    paid:      { label: "Paid",      classes: "bg-emerald-50 text-emerald-700" },
    pending:   { label: "Pending",   classes: "bg-amber-50 text-amber-700" },
    in_transit:{ label: "In transit",classes: "bg-blue-50 text-blue-700" },
    canceled:  { label: "Canceled",  classes: "bg-gray-100 text-gray-500" },
    failed:    { label: "Failed",    classes: "bg-red-50 text-red-700" },
  };

  const notOnboarded = !seller?.stripeAccountId || !seller.stripeOnboarded;
  const isTestMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ?? false;

  return (
    <div className="force-light min-h-screen bg-[#F1F5F9]">
      <SellerHeader storeName={store.name} storeId={store.id} email={session.user.email!} activeTab="Payouts" />

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Payouts</h1>
            <p className="mt-0.5 text-sm text-gray-400">Your Stripe balance and payout history</p>
          </div>
          {!notOnboarded && (
            <div className="flex items-center gap-3">
              {available > 0 && <PayoutNowButton available={available} />}
              {isTestMode && <ClearBalanceButton />}
            </div>
          )}
        </div>

        {notOnboarded ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
            <p className="text-base font-medium text-gray-700">Stripe not connected</p>
            <p className="mt-1 text-sm text-gray-400">Complete Stripe onboarding to receive payouts.</p>
            <Link
              href="/seller/onboarding"
              className="mt-4 inline-flex items-center rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              Connect Stripe
            </Link>
          </div>
        ) : (
          <>
            {/* Balance cards */}
            <div className="mb-4 grid grid-cols-3 gap-4">
              <div className="rounded-2xl bg-[#0F172A] p-5 text-white">
                <p className="text-xs text-white/40">Available to pay out</p>
                <p className="mt-2 text-3xl font-medium">${(available / 100).toFixed(2)}</p>
                <p className="mt-0.5 text-xs text-white/30 uppercase">{currency}</p>
                {nextPayoutDate && (
                  <p className="mt-3 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/60">
                    Next payout · {nextPayoutDate}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="text-xs text-gray-400">Pending balance</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">${(pending / 100).toFixed(2)}</p>
                <p className="mt-0.5 text-xs text-gray-400">Settling in 2–7 business days</p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="text-xs text-gray-400">Lifetime earnings</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">${(lifetimePayout / 100).toFixed(2)}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  From ${(lifetimeRevenue / 100).toFixed(2)} gross · 3% fee
                </p>
              </div>
            </div>

            {/* Payout schedule */}
            {payoutSchedule && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <p className="text-sm text-gray-600">{payoutSchedule}</p>
              </div>
            )}

            {/* Payout history */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-4">
                <p className="text-sm font-semibold text-gray-900">Payout history</p>
              </div>
              {payoutHistory.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-sm text-gray-400">No payouts yet — your first payout will appear here once funds settle.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50 bg-gray-50">
                      <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">Payout ID</th>
                      <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">Amount</th>
                      <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">Status</th>
                      <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">Arrival date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {payoutHistory.map((p) => {
                      const s = statusConfig[p.status] ?? { label: p.status, classes: "bg-gray-100 text-gray-500" };
                      return (
                        <tr key={p.id} className="hover:bg-gray-50/50">
                          <td className="px-5 py-3.5">
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-500">
                              {p.id.slice(0, 14)}…
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">
                            ${(p.amount / 100).toFixed(2)} <span className="text-xs font-normal text-gray-400 uppercase">{p.currency}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${s.classes}`}>
                              {s.label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-gray-400">{p.arrivalDate}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
