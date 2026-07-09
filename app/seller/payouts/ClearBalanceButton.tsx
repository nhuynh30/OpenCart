"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

export default function ClearBalanceButton() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [reversed, setReversed] = useState(0);

  async function handle() {
    if (!confirm("This will reverse all Stripe transfers to your account, zeroing your balance. Continue?")) return;
    setState("loading");
    try {
      const res  = await fetch("/api/seller/clear-balance", { method: "POST" });
      const data = await res.json();
      setReversed(data.reversed ?? 0);
      setState("done");
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  }

  return (
    <button
      onClick={handle}
      disabled={state === "loading" || state === "done"}
      className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-60"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {state === "idle"    && "Clear test balance"}
      {state === "loading" && "Clearing…"}
      {state === "done"    && `Reversed ${reversed} transfer${reversed !== 1 ? "s" : ""} ✓`}
      {state === "error"   && "Failed — try again"}
    </button>
  );
}
