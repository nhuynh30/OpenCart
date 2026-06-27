import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Navbar from "@/app/components/Navbar";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; search?: string }>;
}) {
  const { category, search } = await searchParams;

  const categories = await prisma.product.findMany({
    where: { active: true },
    select: { category: true },
    distinct: ["category"],
  });
  const categoryList = categories
    .map((c) => c.category)
    .filter((c): c is string => c !== null)
    .sort();

  const products = await prisma.product.findMany({
    where: {
      active: true,
      ...(category ? { category } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    include: { store: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <Navbar />
      </div>

      <form action="/" method="GET" className="mb-6">
        {category && <input type="hidden" name="category" value={category} />}
        <input
          type="text"
          name="search"
          placeholder="Search products..."
          defaultValue={search || ""}
          className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
        />
      </form>

      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href={search ? `/?search=${encodeURIComponent(search)}` : "/"}
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${
            !category
              ? "bg-black text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          All
        </Link>
        {categoryList.map((cat) => (
          <Link
            key={cat}
            href={`/?category=${encodeURIComponent(cat)}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              category === cat
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {cat}
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-500">
          No products found.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="group rounded-lg border border-gray-200 p-4 transition hover:border-gray-400"
            >
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="mb-4 h-48 w-full rounded-md object-cover"
                />
              ) : (
                <div className="mb-4 flex h-48 w-full items-center justify-center rounded-md bg-gray-100 text-sm text-gray-400">
                  No image
                </div>
              )}
              <h2 className="font-medium group-hover:underline">
                {product.name}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {product.store.name}
              </p>
              <p className="mt-2 text-lg font-semibold">
                ${(product.price / 100).toFixed(2)}
              </p>
              {product.category && (
                <span className="mt-2 inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
                  {product.category}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
