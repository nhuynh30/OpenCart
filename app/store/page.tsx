import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Suspense } from "react";
import { Star } from "lucide-react";
import SearchInput from "../components/SearchInput";
import StorefrontSignOut from "../components/StorefrontSignOut";
import CartIcon from "../components/CartIcon";
import SortSelect from "../components/SortSelect";

const categoryGradients: Record<string, string> = {
  clothing:    "from-violet-100 to-violet-200",
  electronics: "from-sky-100 to-sky-200",
  household:   "from-emerald-100 to-emerald-200",
  furniture:   "from-emerald-100 to-emerald-200",
  jewelry:     "from-amber-100 to-amber-200",
  books:       "from-orange-100 to-orange-200",
  food:        "from-yellow-100 to-yellow-200",
  sport:       "from-cyan-100 to-cyan-200",
  sports:      "from-cyan-100 to-cyan-200",
  music:       "from-pink-100 to-pink-200",
  tools:       "from-stone-100 to-stone-200",
  beauty:      "from-rose-100 to-rose-200",
  toys:        "from-indigo-100 to-indigo-200",
  art:         "from-fuchsia-100 to-fuchsia-200",
  design:      "from-fuchsia-100 to-fuchsia-200",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; sort?: string }>;
}) {
  const { category, q, sort } = await searchParams;
  const session = await getServerSession(authOptions);

  const categories = await prisma.product.findMany({
    where: { active: true },
    select: { category: true },
    distinct: ["category"],
  });
  const categoryList = [
    ...new Set(
      categories
        .map((c) => c.category?.toLowerCase())
        .filter((c): c is string => c !== null)
    ),
  ].sort();

  const products = await prisma.product.findMany({
    where: {
      active: true,
      ...(category ? { category: { equals: category, mode: "insensitive" } } : {}),
      ...(q ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
        ],
      } : {}),
    },
    include: { store: { include: { seller: { select: { stripeOnboarded: true } } } } },
    orderBy:
      sort === "price_asc" ? { price: "asc" } :
      sort === "price_desc" ? { price: "desc" } :
      { createdAt: "desc" },
  });

  const ratingGroups = await prisma.review.groupBy({
    by: ["productId"],
    where: { productId: { in: products.map((p) => p.id) } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  const ratingsByProduct = new Map(
    ratingGroups.map((r) => [r.productId, { avg: r._avg.rating ?? 0, count: r._count.rating }])
  );

  if (sort === "rating") {
    products.sort((a, b) => (ratingsByProduct.get(b.id)?.avg ?? 0) - (ratingsByProduct.get(a.id)?.avg ?? 0));
  }

  return (
    <div className="min-h-screen bg-white">

      {/* ── Topnav ─────────────────────────────────────────────────── */}
      <header className="border-b border-[#F1F5F9] bg-white">
        <div className="flex h-[46px] items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-6">
            <Link href="/store" className="text-sm font-medium text-[#0F172A]">
              OpenCart
            </Link>
            <nav className="hidden items-center gap-4 md:flex">
              <Link
                href={q ? `/store?q=${encodeURIComponent(q)}` : "/store"}
                className={`text-xs ${!category ? "font-medium text-[#0F172A]" : "text-[#94A3B8] hover:text-[#0F172A]"}`}
              >
                All
              </Link>
              {categoryList.map((cat) => (
                <Link
                  key={cat}
                  href={`/store?category=${encodeURIComponent(cat)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                  className={`text-xs capitalize ${category === cat ? "font-medium text-[#0F172A]" : "text-[#94A3B8] hover:text-[#0F172A]"}`}
                >
                  {cat}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-4">
            {(!session || session.user.role === "BUYER") && <CartIcon />}
            {session ? (
              <>
                <span className="hidden text-xs text-[#64748B] sm:block">
                  {session.user.email}
                </span>
                <span className="hidden rounded-full border border-[#E2E8F0] px-2.5 py-0.5 text-[10px] font-medium text-[#64748B] sm:inline-block">
                  {session.user.role}
                </span>
                {session.user.role === "BUYER" && (
                  <>
                    <Link href="/orders" className="text-xs text-[#64748B] hover:text-[#0F172A]">
                      My orders
                    </Link>
                    <Link href="/messages" className="hidden text-xs text-[#64748B] hover:text-[#0F172A] sm:inline">
                      Messages
                    </Link>
                  </>
                )}
                {session.user.role === "SELLER" && (
                  <>
                    <Link href="/seller/dashboard" className="text-xs text-[#64748B] hover:text-[#0F172A]">
                      Dashboard
                    </Link>
                    <Link href="/messages" className="hidden text-xs text-[#64748B] hover:text-[#0F172A] sm:inline">
                      Messages
                    </Link>
                  </>
                )}
                <StorefrontSignOut />
              </>
            ) : (
              <>
                <Link href="/login" className="text-xs text-[#64748B] hover:text-[#0F172A]">
                  Sign in
                </Link>
                <Link href="/register" className="text-xs font-medium text-[#0F172A] hover:underline">
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Dark hero ──────────────────────────────────────────────── */}
      <section
        className="relative bg-[#0F172A] px-4 pb-9 pt-10 sm:px-8"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        <p className="mb-3 text-[10px] font-medium uppercase tracking-[.14em] text-white/30">
          Marketplace · {products.length} products
        </p>
        <h1 className="mb-2 text-3xl font-normal leading-tight tracking-tight text-white sm:text-4xl">
          Discover something{" "}
          <em className="italic text-white/30">new.</em>
        </h1>
        <p className="mb-6 text-sm text-white/35">
          Browse products from all stores, all in one place.
        </p>

        <Suspense fallback={null}>
          <SearchInput defaultValue={q} />
        </Suspense>
      </section>

      {/* ── Filter strip ───────────────────────────────────────────── */}
      <div className="border-b border-[#F1F5F9] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-8">
          <div className="flex flex-wrap items-center gap-1">
            <Link
              href={q ? `/store?q=${encodeURIComponent(q)}` : "/store"}
              className={`rounded-full px-3 py-1 text-xs ${
                !category
                  ? "border border-[#0F172A] font-medium text-[#0F172A]"
                  : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
              }`}
            >
              All
            </Link>
            {categoryList.map((cat) => (
              <Link
                key={cat}
                href={`/store?category=${encodeURIComponent(cat)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className={`rounded-full px-3 py-1 text-xs capitalize ${
                  category === cat
                    ? "border border-[#0F172A] font-medium text-[#0F172A]"
                    : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                }`}
              >
                {cat}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-[#94A3B8]">{products.length} products</span>
            <SortSelect defaultValue={sort} />
          </div>
        </div>
      </div>

      {/* ── Product grid ───────────────────────────────────────────── */}
      <main className="bg-white px-4 py-6 sm:px-8">
        {products.length === 0 ? (
          <div className="py-24 text-center">
            <p className="font-normal text-[#64748B]">No products found.</p>
            <Link
              href="/store"
              className="mt-3 inline-block text-sm text-[#94A3B8] underline hover:text-[#0F172A]"
            >
              Clear filters
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => {
              const gradient =
                categoryGradients[product.category?.toLowerCase() ?? ""] ??
                "from-slate-100 to-slate-200";
              const showImage =
                !!product.imageUrl &&
                (product.imageUrl.startsWith("/uploads/") ||
                  product.imageUrl.startsWith("https://") ||
                  product.imageUrl.startsWith("http://"));
              const rating = ratingsByProduct.get(product.id);
              const sellerReady = product.store.seller.stripeOnboarded;

              return (
                <div
                  key={product.id}
                  className="group overflow-hidden rounded-[8px] bg-[#F8FAFC]"
                >
                  <Link href={`/products/${product.id}`} className="block">
                    <div className="relative overflow-hidden bg-[#F8F8F8]" style={{ aspectRatio: "4/3" }}>
                      {showImage ? (
                        <img
                          src={product.imageUrl!}
                          alt={product.name}
                          className={`h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-[1.03] ${sellerReady ? "" : "opacity-60 grayscale"}`}
                        />
                      ) : (
                        <div className={`h-full w-full bg-gradient-to-br ${gradient} ${sellerReady ? "" : "opacity-60 grayscale"}`} />
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity duration-[250ms] group-hover:opacity-100" />

                      {product.category && (
                        <span className="absolute left-2.5 top-2.5 rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-medium uppercase tracking-wide text-[#475569] backdrop-blur-sm">
                          {product.category}
                        </span>
                      )}

                      {!sellerReady && (
                        <span className="absolute left-2.5 bottom-2.5 rounded-full bg-gray-900/80 px-2.5 py-1 text-[9px] font-medium uppercase tracking-wide text-white backdrop-blur-sm">
                          Not yet purchasable
                        </span>
                      )}

                      <span className="absolute right-2.5 top-2.5 rounded-md bg-white px-2.5 py-1 text-[11px] font-medium text-[#0F172A] shadow-sm">
                        ${(product.price / 100).toFixed(2)}
                      </span>

                      <div className="absolute bottom-0 left-0 right-0 translate-y-1.5 p-3 opacity-0 transition-all duration-[250ms] group-hover:translate-y-0 group-hover:opacity-100">
                        <p className="text-[13px] font-medium text-white">{product.name}</p>
                        <p className="mt-0.5 text-[11px] text-white/55">{product.store.name}</p>
                      </div>
                    </div>

                    <div className="px-3 pt-2.5 pb-1">
                      <p className="truncate text-[13px] font-medium text-[#0F172A]">
                        {product.name}
                      </p>
                      {rating && (
                        <div className="mt-1 flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <span className="text-[11px] text-[#94A3B8]">
                            {rating.avg.toFixed(1)} ({rating.count})
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="flex items-center justify-between px-3 pb-2.5">
                    <Link
                      href={`/stores/${product.store.id}`}
                      className="text-[11px] text-[#94A3B8] hover:text-[#0F172A] hover:underline"
                    >
                      {product.store.name}
                    </Link>
                    <span className="text-[12px] font-medium text-[#0F172A]">
                      ${(product.price / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
