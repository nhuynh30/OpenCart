"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";

export default function AskSellerButton({
  productId,
  sellerId,
}: {
  productId: string;
  sellerId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, sellerId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not open chat");
        return;
      }
      router.push(`/messages/${data.conversation.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        onClick={handleClick}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        <MessageCircle className="h-4 w-4" />
        {loading ? "Opening chat…" : "Ask seller a question"}
      </button>
      {error && <p className="mt-1.5 text-center text-xs text-red-500">{error}</p>}
    </div>
  );
}
