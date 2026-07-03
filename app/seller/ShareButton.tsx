"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

export default function ShareButton({ storeId }: { storeId: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = `${window.location.origin}/stores/${storeId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for browsers that block clipboard
      prompt("Copy your store link:", url);
    }
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-500" />
      ) : (
        <Share2 className="h-4 w-4 text-gray-400" />
      )}
      {copied ? "Copied!" : "Share store link"}
    </button>
  );
}
