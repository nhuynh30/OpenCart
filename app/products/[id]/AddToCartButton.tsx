"use client";

import { useState } from "react";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { useCart } from "@/app/components/CartContext";

export default function AddToCartButton({
  productId,
  name,
  price,
  imageUrl,
  storeId,
  storeName,
}: {
  productId: string;
  name: string;
  price: number;
  imageUrl: string | null;
  storeId: string;
  storeName: string;
}) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem({ productId, name, price, imageUrl, storeId, storeName }, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="mt-2.5">
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-xl border border-gray-200">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex h-10 w-9 items-center justify-center text-gray-500 hover:text-gray-900"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-8 text-center text-sm font-medium text-gray-900">{quantity}</span>
          <button
            onClick={() => setQuantity((q) => Math.min(99, q + 1))}
            className="flex h-10 w-9 items-center justify-center text-gray-500 hover:text-gray-900"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          onClick={handleAdd}
          className="flex-1 rounded-xl border border-gray-900 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-50"
        >
          {added ? "Added ✓" : "Add to cart"}
        </button>
      </div>
      {added && (
        <Link href="/cart" className="mt-2 inline-block text-xs text-gray-400 underline hover:text-gray-700">
          View cart →
        </Link>
      )}
    </div>
  );
}
