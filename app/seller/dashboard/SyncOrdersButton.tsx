"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

export default function SyncOrdersButton() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [synced, setSynced] = useState(0);

  async function handleSync() {
    setState("loading");
    try {
      const res = await fetch("/api/seller/sync-orders", { method: "POST" });
      const data = await res.json();
      setSynced(data.synced ?? 0);
      setState("done");
      // Refresh the page after a short delay so stats update
      setTimeout(() => window.location.reload(), 1200);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  }

  return (
    <button
      onClick={handleSync}
      disabled={state === "loading" || state === "done"}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60"
    >
      <RefreshCw
        className={`h-4 w-4 text-gray-400 ${state === "loading" ? "animate-spin" : ""}`}
      />
      {state === "idle" && "Sync orders"}
      {state === "loading" && "Syncing…"}
      {state === "done" && `Synced ${synced} order${synced !== 1 ? "s" : ""} ✓`}
      {state === "error" && "Sync failed"}
    </button>
  );
}
