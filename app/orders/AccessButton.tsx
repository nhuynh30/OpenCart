"use client";

import { useState } from "react";
import { Download, X, CheckCircle } from "lucide-react";

export default function AccessButton({ productName }: { productName: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
      >
        <Download className="h-3.5 w-3.5" />
        Access
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <h3 className="text-base font-semibold text-gray-900">
              Purchase confirmed
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              You have access to{" "}
              <span className="font-medium text-gray-700">{productName}</span>.
            </p>
            <div className="mt-4 rounded-xl bg-gray-50 p-4 text-center">
              <p className="text-xs text-gray-400">
                Digital delivery coming soon. Your purchase is recorded and the
                seller has been notified.
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="mt-4 w-full rounded-lg bg-black py-2.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
