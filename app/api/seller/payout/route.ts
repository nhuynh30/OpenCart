import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { redis } from "@/lib/redis";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SELLER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const seller = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stripeAccountId: true, stripeOnboarded: true },
  });

  if (!seller?.stripeAccountId || !seller.stripeOnboarded) {
    return NextResponse.json({ error: "Stripe not connected" }, { status: 422 });
  }

  const accountId = seller.stripeAccountId;

  const balance = await stripe.balance.retrieve({}, { stripeAccount: accountId });
  const available = balance.available.reduce((s, b) => s + b.amount, 0);

  if (available <= 0) {
    return NextResponse.json({ error: "No available balance to pay out" }, { status: 422 });
  }

  const currency = balance.available[0]?.currency ?? "usd";

  try {
    await stripe.payouts.create(
      { amount: available, currency },
      { stripeAccount: accountId }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Payout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Bust the balance cache so the page reflects $0 available immediately
  await redis.del(`stripe:balance:${accountId}`);

  return NextResponse.json({ paid: available, currency });
}
