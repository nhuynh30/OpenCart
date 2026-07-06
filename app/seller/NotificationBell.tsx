"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, MessageCircle } from "lucide-react";

type Order = {
  id: string;
  status: string;
  amountTotal: number;
  createdAt: string;
  product: { name: string };
};

const STATUS = {
  PAID:    { label: "Paid",    dot: "bg-emerald-400" },
  PENDING: { label: "Pending", dot: "bg-amber-400" },
  FAILED:  { label: "Failed",  dot: "bg-red-400" },
} as const;

export default function NotificationBell() {
  const [open, setOpen]             = useState(false);
  const [orders, setOrders]         = useState<Order[]>([]);
  const [pendingCount, setPending]  = useState(0);
  const [unreadMessages, setUnread] = useState(0);
  const [loaded, setLoaded]         = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/seller/notifications")
      .then((r) => r.json())
      .then((d) => {
        setOrders(d.orders ?? []);
        setPending(d.pendingCount ?? 0);
        setUnread(d.unreadMessages ?? 0);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 text-gray-400 hover:bg-gray-200"
      >
        <Bell className="h-3.5 w-3.5" />
        {loaded && (pendingCount + unreadMessages) > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {(pendingCount + unreadMessages) > 9 ? "9+" : (pendingCount + unreadMessages)}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">Notifications</p>
            {pendingCount > 0 && (
              <p className="mt-0.5 text-xs text-amber-600">{pendingCount} pending order{pendingCount !== 1 ? "s" : ""} need attention</p>
            )}
          </div>

          {orders.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">No orders yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {orders.map((order) => {
                const s = STATUS[order.status as keyof typeof STATUS] ?? STATUS.PENDING;
                return (
                  <a
                    key={order.id}
                    href="/seller/orders"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {order.product.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        ${(order.amountTotal / 100).toFixed(2)} · {s.label} ·{" "}
                        {new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
          )}

          {unreadMessages > 0 && (
            <a
              href="/messages"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 border-t border-gray-100 px-4 py-3 hover:bg-gray-50"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                <MessageCircle className="h-3.5 w-3.5 text-indigo-500" />
              </span>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {unreadMessages} unread message{unreadMessages !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-gray-400">From buyers with questions</p>
              </div>
            </a>
          )}

          <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between">
            <a href="/seller/orders" onClick={() => setOpen(false)} className="text-xs font-medium text-indigo-500 hover:text-indigo-700">
              View all orders →
            </a>
            <a href="/messages" onClick={() => setOpen(false)} className="text-xs font-medium text-gray-400 hover:text-gray-700">
              Messages →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
