"use client";

import { useState } from "react";
import { ArrowDownToLine } from "lucide-react";

export default function PayoutNowButton({ available }: { available: number }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handle() {
    setState("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/seller/payout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Payout failed");
        setState("error");
        setTimeout(() => setState("idle"), 4000);
        return;
      }
      setState("done");
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      setErrorMsg("Network error");
      setState("error");
      setTimeout(() => setState("idle"), 4000);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handle}
        disabled={state !== "idle" || available <= 0}
        className="flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <ArrowDownToLine className="h-3.5 w-3.5" />
        {state === "idle"    && `Pay out $${(available / 100).toFixed(2)}`}
        {state === "loading" && "Processing…"}
        {state === "done"    && "Payout initiated ✓"}
        {state === "error"   && "Failed — retry"}
      </button>
      {state === "error" && errorMsg && (
        <p className="text-xs text-red-500">{errorMsg}</p>
      )}
    </div>
  );
}
