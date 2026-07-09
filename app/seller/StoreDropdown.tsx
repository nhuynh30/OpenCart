"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, ExternalLink, Settings } from "lucide-react";

export default function StoreDropdown({
  storeName,
  storeId,
}: {
  storeName: string;
  storeId: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
      >
        <span>🏪</span>
        <span>{storeName}</span>
        <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-48 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg z-50">
          <div className="border-b border-gray-100 px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Your store</p>
            <p className="mt-0.5 text-sm font-semibold text-gray-900 truncate">{storeName}</p>
          </div>
          <div className="py-1">
            <Link
              href={`/stores/${storeId}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
              View my store
            </Link>
            <Link
              href="/seller/store/edit"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Settings className="h-3.5 w-3.5 text-gray-400" />
              Edit store info
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
