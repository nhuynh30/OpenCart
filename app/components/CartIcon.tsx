"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "./CartContext";

export default function CartIcon() {
  const { totalCount } = useCart();

  return (
    <Link href="/cart" className="relative text-xs text-[#64748B] hover:text-[#0F172A]">
      <span className="flex items-center gap-1">
        <ShoppingCart className="h-3.5 w-3.5" />
        Cart
      </span>
      {totalCount > 0 && (
        <span className="absolute -right-2.5 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[9px] font-bold text-white">
          {totalCount > 9 ? "9+" : totalCount}
        </span>
      )}
    </Link>
  );
}
