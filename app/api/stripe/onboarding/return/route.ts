import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SELLER") {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { store: true },
  });

  if (!user?.stripeAccountId) {
    return NextResponse.redirect(new URL("/seller/onboarding", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
  }

  const account = await stripe.accounts.retrieve(user.stripeAccountId);

  if (account.details_submitted) {
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeOnboarded: true },
    });
    const destination = user.store ? "/seller/dashboard" : "/seller/store/create";
    return NextResponse.redirect(new URL(destination, process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
  }

  return NextResponse.redirect(new URL("/seller/onboarding", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
}
