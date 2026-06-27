import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BuyButton from "./BuyButton";

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string }>;
}) {
  const { id } = await params;
  const { success } = await searchParams;

  const product = await prisma.product.findUnique({
    where: { id, active: true },
    include: { store: true },
  });

  if (!product) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {success && (
        <div className="mb-6 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          Payment successful! Your order has been placed.
        </div>
      )}

      <Link
        href="/"
        className="mb-6 inline-block text-sm text-gray-500 hover:text-gray-700"
      >
        &larr; Back to products
      </Link>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-80 w-full rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-80 w-full items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-400">
            No image
          </div>
        )}

        <div>
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{product.store.name}</p>
          <p className="mt-4 text-3xl font-semibold">
            ${(product.price / 100).toFixed(2)}
          </p>
          {product.category && (
            <span className="mt-3 inline-block rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
              {product.category}
            </span>
          )}
          {product.description && (
            <p className="mt-4 text-sm leading-relaxed text-gray-700">
              {product.description}
            </p>
          )}
          <BuyButton productId={product.id} />
        </div>
      </div>
    </div>
  );
}
