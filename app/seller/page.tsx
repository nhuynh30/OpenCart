"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Store {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

interface SellerStatus {
  stripeOnboarded: boolean;
  hasStore: boolean;
  store: Store | null;
}

export default function SellerDashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [status, setStatus] = useState<SellerStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/seller/status")
      .then((res) => res.json())
      .then((data) => {
        if (!data.stripeOnboarded) {
          router.replace("/seller/onboarding");
        } else if (!data.hasStore) {
          router.replace("/seller/store/create");
        } else {
          setStatus(data);
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-bold">
            {status?.store?.name ?? "Seller Dashboard"}
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{session?.user?.email}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-sm text-gray-500 hover:text-black"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-lg border bg-white p-6">
            <p className="text-sm text-gray-500">Products</p>
            <p className="mt-1 text-2xl font-bold">0</p>
          </div>
          <div className="rounded-lg border bg-white p-6">
            <p className="text-sm text-gray-500">Orders</p>
            <p className="mt-1 text-2xl font-bold">0</p>
          </div>
          <div className="rounded-lg border bg-white p-6">
            <p className="text-sm text-gray-500">Stripe</p>
            <p className="mt-1 text-2xl font-bold text-green-600">Connected</p>
          </div>
        </div>

        <div className="mt-10 rounded-lg border bg-white p-6 text-center text-gray-500">
          <p className="text-lg font-medium text-gray-900">No products yet</p>
          <p className="mt-1 text-sm">
            Start listing products to begin selling on OpenCart.
          </p>
        </div>
      </main>
    </div>
  );
}
