import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

/**
 * @swagger
 * /api/checkout:
 *   post:
 *     summary: Create a Stripe Checkout session
 *     description: Creates a Stripe Checkout session for a product purchase with a 3% platform fee. Redirects buyer to Stripe-hosted checkout.
 *     tags:
 *       - Checkout
 *     security:
 *       - nextAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *             properties:
 *               productId:
 *                 type: string
 *                 example: clxyz123abc
 *     responses:
 *       200:
 *         description: Checkout session created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   description: Stripe Checkout URL to redirect the buyer to
 *       400:
 *         description: Missing productId
 *       401:
 *         description: Unauthorized — must be logged in
 *       404:
 *         description: Product not found or inactive
 *       422:
 *         description: Seller has not completed Stripe onboarding
 *       429:
 *         description: Too many checkout attempts — rate limit exceeded
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rateLimit = await checkRateLimit("checkout", ip);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many checkout attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { productId } = body;

  if (!productId) {
    return NextResponse.json(
      { error: "productId is required" },
      { status: 400 }
    );
  }

  const product = await prisma.product.findUnique({
    where: { id: productId, active: true },
    include: { store: { include: { seller: true } } },
  });

  if (!product) {
    return NextResponse.json(
      { error: "Product not found" },
      { status: 404 }
    );
  }

  const seller = product.store.seller;

  if (!seller.stripeAccountId || !seller.stripeOnboarded) {
    return NextResponse.json(
      { error: "Seller has not completed Stripe onboarding" },
      { status: 422 }
    );
  }

  const platformFee = Math.round(product.price * 0.03);

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: product.name,
            ...(product.description ? { description: product.description } : {}),
            ...(product.imageUrl ? { images: [product.imageUrl] } : {}),
          },
          unit_amount: product.price,
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: platformFee,
      transfer_data: {
        destination: seller.stripeAccountId,
      },
    },
    success_url: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/products/${product.id}?success=true`,
    cancel_url: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/products/${product.id}`,
  });

  await prisma.order.create({
    data: {
      buyerId: session.user.id,
      sellerId: seller.id,
      productId: product.id,
      stripeSessionId: checkoutSession.id,
      amountTotal: product.price,
      platformFee,
      status: "PENDING",
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
