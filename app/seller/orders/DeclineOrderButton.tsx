"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";

export default function DeclineOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handle() {
    if (!confirm("Decline this order and refund the buyer in full? This can't be undone.")) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/seller/orders/${orderId}/decline`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.refresh();
      } else {
        setError(data.error ?? `Failed (${res.status})`);
        setLoading(false);
      }
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handle}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
      >
        <XCircle className="h-3 w-3" />
        {loading ? "Declining…" : "Decline & refund"}
      </button>
      {error && <p className="mt-1 w-32 text-[11px] leading-snug text-red-500">{error}</p>}
    </div>
  );
}
