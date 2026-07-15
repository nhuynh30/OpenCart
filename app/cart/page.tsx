"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Minus, Plus, Trash2, ShoppingBag, ShoppingCart, CheckCircle2 } from "lucide-react";
import { useCart, CartItem } from "@/app/components/CartContext";

export default function CartPage() {
  return (
    <Suspense fallback={null}>
      <CartPageInner />
    </Suspense>
  );
}

function CartPageInner() {
  const { data: session, status } = useSession();
  const { items, totalPrice, updateQuantity, removeItem, removeItems } = useCart();
  const searchParams = useSearchParams();
  const justPaid = searchParams.get("success") === "true";
  const paidStoreId = searchParams.get("storeId");

  const groups = groupByStore(items);
  const storeIds = Object.keys(groups);

  const cleared = useRef(false);
  useEffect(() => {
    if (justPaid && !cleared.current) {
      cleared.current = true;
      toast.success("Payment successful!");
      if (paidStoreId && groups[paidStoreId]) {
        removeItems(groups[paidStoreId].items.map((i) => i.productId));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justPaid]);

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <header className="bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <Link href="/store" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black">
              <ShoppingBag className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold">OpenCart</span>
          </Link>
          <Link href="/store" className="text-xs text-gray-500 hover:text-gray-900">
            Continue shopping
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6 flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-gray-400" />
          <h1 className="text-xl font-semibold text-gray-900">Your cart</h1>
        </div>

        {justPaid && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Payment successful!</p>
              {items.length > 0 ? (
                <p className="mt-0.5 text-green-700">
                  That store&apos;s order is placed. You still have items from {storeIds.length} more store
                  {storeIds.length !== 1 ? "s" : ""} below — check out separately to complete your purchase.
                </p>
              ) : (
                <p className="mt-0.5 text-green-700">
                  Your order has been placed.{" "}
                  <Link href="/orders" className="font-medium underline">
                    View your orders →
                  </Link>
                </p>
              )}
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-20 text-center shadow-sm">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
              <ShoppingCart className="h-6 w-6 text-gray-300" />
            </div>
            <p className="font-medium text-gray-500">Your cart is empty</p>
            <p className="mt-1 text-sm text-gray-400">Browse products and add something you like.</p>
            <Link
              href="/store"
              className="mt-5 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <>
            {storeIds.length > 1 && (
              <p className="mb-4 text-xs text-gray-400">
                Your cart has items from {storeIds.length} stores. Since each store is paid separately,
                you&apos;ll check out one store at a time.
              </p>
            )}

            <div className="space-y-4">
              {storeIds.map((storeId, i) => (
                <StoreGroup
                  key={storeId}
                  storeId={storeId}
                  storeName={groups[storeId].storeName}
                  items={groups[storeId].items}
                  step={storeIds.length > 1 ? { index: i + 1, total: storeIds.length } : null}
                  session={session}
                  sessionStatus={status}
                  updateQuantity={updateQuantity}
                  removeItem={removeItem}
                />
              ))}
            </div>

            {storeIds.length > 1 && (
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
                <span className="text-sm text-gray-500">Cart total</span>
                <span className="text-lg font-semibold text-gray-900">${(totalPrice / 100).toFixed(2)}</span>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function groupByStore(items: CartItem[]) {
  const groups: Record<string, { storeName: string; items: CartItem[] }> = {};
  for (const item of items) {
    if (!groups[item.storeId]) {
      groups[item.storeId] = { storeName: item.storeName, items: [] };
    }
    groups[item.storeId].items.push(item);
  }
  return groups;
}

function StoreGroup({
  storeId,
  storeName,
  items,
  step,
  session,
  sessionStatus,
  updateQuantity,
  removeItem,
}: {
  storeId: string;
  storeName: string;
  items: CartItem[];
  step: { index: number; total: number } | null;
  session: ReturnType<typeof useSession>["data"];
  sessionStatus: ReturnType<typeof useSession>["status"];
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  async function handleCheckout() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-50 px-5 py-3">
        <div className="flex items-center gap-2">
          {step && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
              {step.index} of {step.total}
            </span>
          )}
          <span className="text-sm font-semibold text-gray-900">{storeName}</span>
        </div>
        <Link href={`/stores/${storeId}`} className="text-xs text-gray-400 hover:text-gray-700">
          Visit store →
        </Link>
      </div>

      <div className="divide-y divide-gray-50">
        {items.map((item) => (
          <div key={item.productId} className="flex items-center gap-4 px-5 py-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#F8FAFC]">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="h-full w-full object-contain p-1.5" />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-slate-100 to-slate-200" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
              <p className="mt-0.5 text-xs text-gray-400">${(item.price / 100).toFixed(2)} each</p>
            </div>

            <div className="flex items-center rounded-lg border border-gray-200">
              <button
                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                disabled={item.quantity <= 1}
                className="flex h-8 w-7 items-center justify-center text-gray-500 hover:text-gray-900 disabled:opacity-30"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-6 text-center text-xs font-medium text-gray-900">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                className="flex h-8 w-7 items-center justify-center text-gray-500 hover:text-gray-900"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>

            <span className="w-16 shrink-0 text-right text-sm font-semibold text-gray-900">
              ${((item.price * item.quantity) / 100).toFixed(2)}
            </span>

            <button
              onClick={() => removeItem(item.productId)}
              className="shrink-0 text-gray-300 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-50 px-5 py-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Subtotal</span>
          <span className="text-lg font-semibold text-gray-900">${(subtotal / 100).toFixed(2)}</span>
        </div>

        {error && (
          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        {sessionStatus === "loading" ? null : !session ? (
          <Link
            href="/login?redirect=/cart"
            className="mt-4 block w-full rounded-xl bg-black py-3 text-center text-sm font-medium text-white hover:bg-gray-800"
          >
            Sign in to checkout
          </Link>
        ) : session.user.role === "SELLER" ? (
          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
            Seller accounts can&apos;t make purchases. Sign in with a buyer account to check out.
          </div>
        ) : (
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-black py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Redirecting to checkout…" : `Checkout ${storeName}`}
          </button>
        )}
      </div>
    </div>
  );
}
