"use client";

import Link from "next/link";

const filters = [
  { label: "All", value: undefined },
  { label: "Paid", value: "PAID" },
  { label: "Pending", value: "PENDING" },
];

export default function OrderFilters({
  currentStatus,
}: {
  currentStatus?: string;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-gray-100 p-0.5">
      {filters.map(({ label, value }) => {
        const isActive =
          currentStatus === value || (!currentStatus && value === undefined);
        return (
          <Link
            key={label}
            href={
              value ? `/seller/dashboard?status=${value}` : "/seller/dashboard"
            }
            className={`rounded-full px-3.5 py-1 text-xs font-medium transition-colors ${
              isActive
                ? "bg-black text-white shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
