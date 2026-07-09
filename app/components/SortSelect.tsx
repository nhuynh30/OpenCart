"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const OPTIONS = [
  { value: "newest",     label: "Latest" },
  { value: "price_asc",  label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "rating",     label: "Top rated" },
] as const;

export default function SortSelect({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "newest") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      defaultValue={defaultValue ?? "newest"}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-md border border-[#E2E8F0] bg-white px-2 py-1 text-xs text-[#475569] outline-none hover:border-[#CBD5E1]"
    >
      {OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
