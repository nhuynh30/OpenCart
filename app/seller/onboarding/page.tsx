"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SellerOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/stripe/onboarding")
      .then((res) => res.json())
      .then((data) => {
        if (data.hasStore) {
          router.replace("/seller");
        } else if (data.stripeOnboarded) {
          router.replace("/seller/store/create");
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  async function handleOnboarding() {
    setError("");
    setLoading(true);

    const res = await fetch("/api/stripe/onboarding", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      if (res.status === 400 && data.error === "Already onboarded") {
        router.push("/seller/store/create");
        return;
      }
      setError(data.error || "Failed to start onboarding");
      setLoading(false);
      return;
    }

    window.location.href = data.url;
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-500">Checking account status...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div>
          <h1 className="text-3xl font-bold">Set up payments</h1>
          <p className="mt-2 text-sm text-gray-500">
            Connect your Stripe account to start receiving payments from
            customers. This only takes a few minutes.
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={handleOnboarding}
          disabled={loading}
          className="w-full rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Connecting to Stripe..." : "Connect with Stripe"}
        </button>
      </div>
    </div>
  );
}
