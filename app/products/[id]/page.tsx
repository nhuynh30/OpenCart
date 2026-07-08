import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { Star } from "lucide-react";
import BuyButton from "./BuyButton";
import AddToCartButton from "./AddToCartButton";
import AskSellerButton from "./AskSellerButton";
import CartIcon from "@/app/components/CartIcon";

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string }>;
}) {
  const { id } = await params;
  const { success } = await searchParams;
  const session = await getServerSession(authOptions);

  const product = await prisma.product.findUnique({
    where: { id, active: true },
    include: { store: { include: { seller: { select: { id: true } } } } },
  });

  if (!product) notFound();

  const reviews = await prisma.review.findMany({
    where: { productId: id },
    include: { buyer: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
  });
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : null;

  const moreFromStore = await prisma.product.findMany({
    where: { storeId: product.storeId, active: true, id: { not: id } },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  // When buyer lands here after payment, sync the order status from Stripe immediately
  // (Stripe webhooks don't fire on localhost, so this covers the local dev case too)
  if (success && session?.user?.role === "BUYER") {
    try {
      const pendingOrder = await prisma.order.findFirst({
        where: { buyerId: session.user.id, productId: id, status: "PENDING" },
        orderBy: { createdAt: "desc" },
      });
      if (pendingOrder?.stripeSessionId) {
        const stripeSession = await stripe.checkout.sessions.retrieve(pendingOrder.stripeSessionId);
        if (stripeSession.payment_status === "paid") {
          await prisma.order.update({
            where: { id: pendingOrder.id },
            data: { status: "PAID" },
          });
        }
      }
    } catch {
      // Non-critical — order will sync eventually via webhook or seller sync
    }
  }

  const isSeller        = session?.user?.role === "SELLER";
  const isProductOwner  = isSeller && session?.user?.id === product.store.seller.id;
  const isLoggedIn      = !!session?.user;

  const showImage =
    !!product.imageUrl &&
    (product.imageUrl.startsWith("/uploads/") ||
      product.imageUrl.startsWith("https://") ||
      product.imageUrl.startsWith("http://"));

  return (
    <div className="min-h-screen bg-white">
      {/* Top nav */}
      <header className="border-b border-[#F1F5F9]">
        <div className="flex h-[46px] items-center justify-between px-8">
          <Link href="/" className="text-sm font-medium text-[#0F172A]">OpenCart</Link>
          <div className="flex items-center gap-4">
            {(!session || session.user.role === "BUYER") && <CartIcon />}
            {session ? (
              <>
                {session.user.role === "SELLER" && (
                  <>
                    <Link href="/seller/dashboard" className="text-xs text-[#64748B] hover:text-[#0F172A]">Dashboard</Link>
                    <Link href="/messages" className="text-xs text-[#64748B] hover:text-[#0F172A]">Messages</Link>
                  </>
                )}
                {session.user.role === "BUYER" && (
                  <>
                    <Link href="/orders" className="text-xs text-[#64748B] hover:text-[#0F172A]">My orders</Link>
                    <Link href="/messages" className="text-xs text-[#64748B] hover:text-[#0F172A]">Messages</Link>
                  </>
                )}
              </>
            ) : (
              <Link href="/login" className="text-xs text-[#64748B] hover:text-[#0F172A]">Sign in</Link>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-8 py-10">
        {success && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Payment successful! Your order has been placed.
          </div>
        )}

        <Link href="/" className="mb-8 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700">
          ← Back to products
        </Link>

        <div className="grid grid-cols-2 gap-12">
          {/* Image */}
          <div className="overflow-hidden rounded-2xl bg-[#F8F8F8]" style={{ aspectRatio: "4/3" }}>
            {showImage ? (
              <img
                src={product.imageUrl!}
                alt={product.name}
                className="h-full w-full object-contain p-6"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-300">No image</div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col">
            <Link
              href={`/stores/${product.store.id}`}
              className="text-sm text-[#94A3B8] hover:text-[#0F172A]"
            >
              {product.store.name}
            </Link>

            <h1 className="mt-2 text-2xl font-semibold text-gray-900">{product.name}</h1>

            {avgRating !== null && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-3.5 w-3.5 ${s <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-500">
                  {avgRating.toFixed(1)} · {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}

            <p className="mt-3 text-3xl font-bold text-gray-900">
              ${(product.price / 100).toFixed(2)}
            </p>

            {product.category && (
              <span className="mt-3 inline-block self-start rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 capitalize">
                {product.category}
              </span>
            )}

            {product.description && (
              <p className="mt-4 text-sm leading-relaxed text-gray-600">{product.description}</p>
            )}

            <div className="mt-auto pt-6">
              {isProductOwner ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  This is your product — you can&apos;t purchase your own listing.
                </div>
              ) : isSeller ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                  Seller accounts can&apos;t make purchases. Sign in with a buyer account to buy this product.
                </div>
              ) : !isLoggedIn ? (
                <Link
                  href={`/login?redirect=/products/${product.id}`}
                  className="block w-full rounded-xl bg-black py-3 text-center text-sm font-medium text-white hover:bg-gray-800"
                >
                  Sign in to buy
                </Link>
              ) : (
                <>
                  <BuyButton productId={product.id} />
                  <AddToCartButton
                    productId={product.id}
                    name={product.name}
                    price={product.price}
                    imageUrl={product.imageUrl}
                    storeId={product.store.id}
                    storeName={product.store.name}
                  />
                  <AskSellerButton
                    productId={product.id}
                    sellerId={product.store.seller.id}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="mt-14 border-t border-gray-100 pt-8">
          <h2 className="text-sm font-semibold text-gray-900">
            Reviews{" "}
            <span className="font-normal text-gray-400">
              ({reviews.length}){avgRating !== null ? ` · ${avgRating.toFixed(1)} avg` : ""}
            </span>
          </h2>

          {reviews.length === 0 ? (
            <p className="mt-4 text-sm text-gray-400">No reviews yet — be the first to buy and leave one.</p>
          ) : (
            <div className="mt-4 space-y-5">
              {reviews.map((review) => (
                <div key={review.id} className="border-b border-gray-50 pb-5 last:border-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-500">
                        {review.buyer.email[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {review.buyer.email.split("@")[0]}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(review.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3.5 w-3.5 ${s <= review.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
                      />
                    ))}
                  </div>
                  {review.comment && (
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* More from this store */}
        {moreFromStore.length > 0 && (
          <div className="mt-14 border-t border-gray-100 pt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">
                More from {product.store.name}
              </h2>
              <Link
                href={`/stores/${product.store.id}`}
                className="text-xs text-[#94A3B8] hover:text-[#0F172A]"
              >
                Visit store →
              </Link>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {moreFromStore.map((item) => {
                const itemShowImage =
                  !!item.imageUrl &&
                  (item.imageUrl.startsWith("/uploads/") ||
                    item.imageUrl.startsWith("https://") ||
                    item.imageUrl.startsWith("http://"));
                return (
                  <Link
                    key={item.id}
                    href={`/products/${item.id}`}
                    className="group block overflow-hidden rounded-[8px] bg-[#F8FAFC]"
                  >
                    <div className="relative overflow-hidden bg-[#F8F8F8]" style={{ aspectRatio: "4/3" }}>
                      {itemShowImage ? (
                        <img
                          src={item.imageUrl!}
                          alt={item.name}
                          className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-slate-100 to-slate-200" />
                      )}
                    </div>
                    <div className="px-1 pt-2">
                      <p className="truncate text-[13px] font-medium text-[#0F172A]">{item.name}</p>
                      <p className="mt-0.5 text-[12px] text-gray-500">${(item.price / 100).toFixed(2)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
