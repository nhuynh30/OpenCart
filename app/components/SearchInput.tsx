"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { useDebouncedCallback } from "use-debounce";

export default function SearchInput({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (term) {
      params.set("q", term);
    } else {
      params.delete("q");
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }, 300);

  return (
    <div
      className={`flex max-w-[500px] overflow-hidden rounded-[9px] border border-white/[0.12] bg-white/[0.07] transition-opacity ${
        isPending ? "opacity-70" : "opacity-100"
      }`}
    >
      <Search className="ml-3 h-4 w-4 shrink-0 self-center text-white/30" />
      <input
        className="flex-1 bg-transparent py-2.5 px-3 text-sm text-white outline-none placeholder:text-white/25"
        placeholder="Search products, stores, categories…"
        defaultValue={defaultValue}
        onChange={(e) => handleSearch(e.target.value)}
      />
    </div>
  );
}
