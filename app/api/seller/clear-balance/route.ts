import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { redis } from "@/lib/redis";

export async function POST() {
  if (!process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) {
    return NextResponse.json({ error: "Only available in test mode" }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SELLER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const seller = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stripeAccountId: true, stripeOnboarded: true },
  });

  if (!seller?.stripeAccountId || !seller.stripeOnboarded) {
    return NextResponse.json({ error: "No Stripe account" }, { status: 400 });
  }

  const accountId = seller.stripeAccountId;

  // Step 1: Reverse all unreversed transfers to this connected account
  const transfers = await stripe.transfers.list({ destination: accountId, limit: 100 });
  let reversed = 0;
  for (const transfer of transfers.data) {
    try {
      const existing = await stripe.transfers.listReversals(transfer.id);
      const alreadyReversed = existing.data.reduce((s, r) => s + r.amount, 0) >= transfer.amount;
      if (!alreadyReversed) {
        await stripe.transfers.createReversal(transfer.id);
        reversed++;
      }
    } catch {
      // skip transfers that can't be reversed
    }
  }

  // Step 2: In test mode, fetch the live balance and pay out any available funds
  // to zero out the connected account. Pending funds settle on Stripe's timeline (2-7 days).
  try {
    const balance = await stripe.balance.retrieve({}, { stripeAccount: accountId });
    for (const b of balance.available) {
      if (b.amount > 0) {
        await stripe.payouts.create(
          { amount: b.amount, currency: b.currency },
          { stripeAccount: accountId }
        );
      }
    }
  } catch {
    // Payout may fail if account isn't fully set up — not critical
  }

  // Step 3: Bust the Redis cache so next page load fetches fresh Stripe data
  await redis.del(`stripe:balance:${accountId}`);

  return NextResponse.json({ reversed });
}
