import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

function stripeImageFor(imageUrl: string | null) {
  return imageUrl?.startsWith("https://") || imageUrl?.startsWith("http://")
    ? imageUrl
    : undefined;
}

/**
 * @swagger
 * /api/checkout:
 *   post:
 *     summary: Create a Stripe Checkout session
 *     description: Creates a Stripe Checkout session for either a single product (Buy Now) or a same-store cart (multiple items). Applies a 3% platform fee. Redirects buyer to Stripe-hosted checkout.
 *     tags:
 *       - Checkout
 *     security:
 *       - nextAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 required: [productId]
 *                 properties:
 *                   productId:
 *                     type: string
 *               - type: object
 *                 required: [items]
 *                 properties:
 *                   items:
 *                     type: array
 *                     items:
 *                       type: object
 *                       required: [productId, quantity]
 *                       properties:
 *                         productId:
 *                           type: string
 *                         quantity:
 *                           type: integer
 *     responses:
 *       200:
 *         description: Checkout session created
 *       400:
 *         description: Missing/invalid productId or items, or items span multiple stores
 *       401:
 *         description: Unauthorized — must be logged in
 *       404:
 *         description: Product(s) not found or inactive
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
  const rawItems: { productId: string; quantity?: number }[] = Array.isArray(body.items)
    ? body.items
    : body.productId
    ? [{ productId: body.productId, quantity: 1 }]
    : [];

  if (rawItems.length === 0) {
    return NextResponse.json(
      { error: "productId or items is required" },
      { status: 400 }
    );
  }

  const isCart = Array.isArray(body.items);

  const quantityByProductId = new Map<string, number>();
  for (const raw of rawItems) {
    const quantity = Math.floor(Number(raw.quantity) || 1);
    if (!raw.productId || quantity < 1 || quantity > 99) {
      return NextResponse.json({ error: "Invalid item in cart" }, { status: 400 });
    }
    quantityByProductId.set(raw.productId, (quantityByProductId.get(raw.productId) ?? 0) + quantity);
  }

  const products = await prisma.product.findMany({
    where: { id: { in: [...quantityByProductId.keys()] }, active: true },
    include: { store: { include: { seller: true } } },
  });

  if (products.length !== quantityByProductId.size) {
    return NextResponse.json({ error: "One or more products not found" }, { status: 404 });
  }

  const distinctSellerIds = new Set(products.map((p) => p.store.sellerId));
  if (distinctSellerIds.size > 1) {
    return NextResponse.json(
      { error: "All items in a single checkout must be from the same store" },
      { status: 400 }
    );
  }

  const seller = products[0].store.seller;

  if (!seller.stripeAccountId || !seller.stripeOnboarded) {
    return NextResponse.json(
      { error: "Seller has not completed Stripe onboarding" },
      { status: 422 }
    );
  }

  const lineItems = products.map((product) => {
    const quantity = quantityByProductId.get(product.id)!;
    const stripeImage = stripeImageFor(product.imageUrl);
    return {
      product,
      quantity,
      amountTotal: product.price * quantity,
      platformFee: Math.round(product.price * quantity * 0.03),
      stripeImage,
    };
  });

  const totalApplicationFee = lineItems.reduce((s, li) => s + li.platformFee, 0);

  const successUrl = isCart
    ? `${BASE_URL}/orders?success=true`
    : `${BASE_URL}/products/${products[0].id}?success=true`;
  const cancelUrl = isCart ? `${BASE_URL}/cart` : `${BASE_URL}/products/${products[0].id}`;

  let checkoutSession;
  try {
    checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems.map((li) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: li.product.name,
            ...(li.product.description ? { description: li.product.description } : {}),
            ...(li.stripeImage ? { images: [li.stripeImage] } : {}),
          },
          unit_amount: li.product.price,
        },
        quantity: li.quantity,
      })),
      payment_intent_data: {
        application_fee_amount: totalApplicationFee,
        transfer_data: {
          destination: seller.stripeAccountId,
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  await prisma.order.createMany({
    data: lineItems.map((li) => ({
      buyerId: session.user.id,
      sellerId: seller.id,
      productId: li.product.id,
      stripeSessionId: checkoutSession.id,
      quantity: li.quantity,
      amountTotal: li.amountTotal,
      platformFee: li.platformFee,
      status: "PENDING" as const,
    })),
  });

  return NextResponse.json({ url: checkoutSession.url });
}
