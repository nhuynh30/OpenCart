import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import StorefrontSignOut from "@/app/components/StorefrontSignOut";
import { ShoppingBag, Star, Package, Calendar } from "lucide-react";

export default async function StorePage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  const session = await getServerSession(authOptions);

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: {
      seller: { select: { email: true, createdAt: true } },
      products: {
        where: { active: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!store) notFound();

  const [totalOrdersSold, uniqueBuyers] = await Promise.all([
    prisma.order.count({
      where: { sellerId: store.sellerId, status: "PAID" },
    }),
    prisma.order.findMany({
      where: { sellerId: store.sellerId, status: "PAID" },
      select: { buyerId: true },
      distinct: ["buyerId"],
    }),
  ]);

  const memberSince = new Date(store.seller.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const categoryGradients: Record<string, string> = {
    clothing: "from-violet-100 to-violet-200",
    electronics: "from-sky-100 to-sky-200",
    household: "from-emerald-100 to-emerald-200",
    furniture: "from-emerald-100 to-emerald-200",
    jewelry: "from-amber-100 to-amber-200",
    books: "from-orange-100 to-orange-200",
    food: "from-yellow-100 to-yellow-200",
    sports: "from-cyan-100 to-cyan-200",
    music: "from-pink-100 to-pink-200",
    tools: "from-stone-100 to-stone-200",
    beauty: "from-rose-100 to-rose-200",
    toys: "from-indigo-100 to-indigo-200",
    art: "from-fuchsia-100 to-fuchsia-200",
    design: "from-fuchsia-100 to-fuchsia-200",
  };

  const products = store.products;

  return (
    <div className="min-h-screen bg-white">
      {/* Top nav */}
      <header className="border-b border-[#F1F5F9] bg-white">
        <div className="flex h-[46px] items-center justify-between px-8">
          <Link href="/" className="text-sm font-medium text-[#0F172A]">OpenCart</Link>
          <div className="flex items-center gap-4">
            {session ? (
              <>
                <span className="text-xs text-[#64748B]">{session.user.email}</span>
                {session.user.role === "BUYER" && (
                  <Link href="/orders" className="text-xs text-[#64748B] hover:text-[#0F172A]">My orders</Link>
                )}
                {session.user.role === "SELLER" && (
                  <Link href="/seller/dashboard" className="text-xs text-[#64748B] hover:text-[#0F172A]">Dashboard</Link>
                )}
                <StorefrontSignOut />
              </>
            ) : (
              <>
                <Link href="/login" className="text-xs text-[#64748B] hover:text-[#0F172A]">Sign in</Link>
                <Link href="/register" className="text-xs font-medium text-[#0F172A] hover:underline">Create account</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Store hero */}
      <section
        className="bg-[#0F172A] px-8 py-12"
        style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "24px 24px" }}
      >
        <div className="mx-auto max-w-5xl">
          {/* Avatar + name */}
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-2xl font-bold text-white">
              {store.name[0].toUpperCase()}
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[.14em] text-white/30">Store</p>
              <h1 className="text-3xl font-semibold text-white">{store.name}</h1>
            </div>
          </div>

          {store.description && (
            <p className="mt-4 max-w-xl text-sm text-white/50">{store.description}</p>
          )}

          {/* Stats row */}
          <div className="mt-8 flex items-center gap-8">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-white/30" />
              <div>
                <p className="text-lg font-semibold text-white">{totalOrdersSold}</p>
                <p className="text-[11px] text-white/30">Orders sold</p>
              </div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-white/30" />
              <div>
                <p className="text-lg font-semibold text-white">{products.length}</p>
                <p className="text-[11px] text-white/30">Active listings</p>
              </div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-white/30" />
              <div>
                <p className="text-lg font-semibold text-white">{uniqueBuyers.length}</p>
                <p className="text-[11px] text-white/30">Happy customers</p>
              </div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-white/30" />
              <div>
                <p className="text-sm font-medium text-white">{memberSince}</p>
                <p className="text-[11px] text-white/30">Member since</p>
              </div>
            </div>
          </div>

          {/* Reputation badge */}
          {totalOrdersSold > 0 && (
            <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-medium text-emerald-400">
                {totalOrdersSold >= 50
                  ? "Top seller"
                  : totalOrdersSold >= 10
                  ? "Established seller"
                  : "New seller"}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Products */}
      <main className="mx-auto max-w-5xl px-8 py-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            Products <span className="ml-1 text-gray-400">({products.length})</span>
          </h2>
          <Link href="/" className="text-xs text-[#94A3B8] hover:text-[#0F172A]">← Back to marketplace</Link>
        </div>

        {products.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-[#64748B]">No products listed yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {products.map((product) => {
              const gradient =
                categoryGradients[product.category?.toLowerCase() ?? ""] ?? "from-slate-100 to-slate-200";
              const showImage =
                !!product.imageUrl &&
                (product.imageUrl.startsWith("/uploads/") ||
                  product.imageUrl.startsWith("https://") ||
                  product.imageUrl.startsWith("http://"));

              return (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="group block cursor-pointer overflow-hidden rounded-[8px] bg-[#F8FAFC]"
                >
                  <div className="relative overflow-hidden bg-[#F8F8F8]" style={{ aspectRatio: "4/3" }}>
                    {showImage ? (
                      <img
                        src={product.imageUrl!}
                        alt={product.name}
                        className="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className={`h-full w-full bg-gradient-to-br ${gradient}`} />
                    )}
                    {product.category && (
                      <span className="absolute left-2.5 top-2.5 rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-medium uppercase tracking-wide text-[#475569] backdrop-blur-sm">
                        {product.category}
                      </span>
                    )}
                    <span className="absolute right-2.5 top-2.5 rounded-md bg-white px-2.5 py-1 text-[11px] font-medium text-[#0F172A] shadow-sm">
                      ${(product.price / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="truncate text-[13px] font-medium text-[#0F172A]">{product.name}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-[11px] text-[#94A3B8]">{store.name}</span>
                      <span className="text-[12px] font-medium text-[#0F172A]">${(product.price / 100).toFixed(2)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
