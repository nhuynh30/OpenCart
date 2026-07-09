"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type CartItem = {
  productId: string;
  name: string;
  price: number; // cents, per unit
  imageUrl: string | null;
  storeId: string;
  storeName: string;
  quantity: number;
};

type AddResult = { ok: true } | { ok: false; conflictStoreName: string };

type CartContextValue = {
  items: CartItem[];
  totalCount: number;
  totalPrice: number;
  storeId: string | null;
  storeName: string | null;
  addItem: (item: Omit<CartItem, "quantity">, quantity: number) => AddResult;
  replaceCart: (item: Omit<CartItem, "quantity">, quantity: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "opencart:cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // corrupt cart data — start fresh
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  function addItem(item: Omit<CartItem, "quantity">, quantity: number): AddResult {
    let conflict: string | null = null;

    setItems((prev) => {
      if (prev.length > 0 && prev[0].storeId !== item.storeId) {
        conflict = prev[0].storeName;
        return prev;
      }
      const existing = prev.find((i) => i.productId === item.productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { ...item, quantity }];
    });

    if (conflict) return { ok: false, conflictStoreName: conflict };
    return { ok: true };
  }

  function replaceCart(item: Omit<CartItem, "quantity">, quantity: number) {
    setItems([{ ...item, quantity }]);
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity < 1) return;
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
    );
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  function clearCart() {
    setItems([]);
  }

  const totalCount = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const storeId = items[0]?.storeId ?? null;
  const storeName = items[0]?.storeName ?? null;

  return (
    <CartContext.Provider
      value={{
        items,
        totalCount,
        totalPrice,
        storeId,
        storeName,
        addItem,
        replaceCart,
        updateQuantity,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
