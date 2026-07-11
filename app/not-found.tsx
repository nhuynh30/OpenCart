import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-8 text-center">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#F1F5F9]">
        <SearchX className="h-5 w-5 text-[#0F172A]" />
      </div>
      <p className="mb-1 text-[10px] font-medium uppercase tracking-[.14em] text-[#94A3B8]">
        404
      </p>
      <h1 className="mb-2 text-2xl font-normal tracking-tight text-[#0F172A]">
        This page doesn&apos;t exist.
      </h1>
      <p className="mb-7 max-w-sm text-sm text-[#64748B]">
        The page you&apos;re looking for may have been moved or never existed.
      </p>
      <Link
        href="/store"
        className="rounded-xl bg-[#0F172A] px-6 py-3 text-sm font-medium text-white hover:bg-[#1E293B]"
      >
        Back to the store
      </Link>
    </div>
  );
}
