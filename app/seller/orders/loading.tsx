import Skeleton from "@/app/components/Skeleton";

export default function SellerOrdersLoading() {
  return (
    <div className="force-light min-h-screen bg-[#F1F5F9]">
      <div className="flex h-14 items-center justify-between border-b border-gray-100 bg-white px-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6">
          <Skeleton className="mb-2 h-6 w-24" />
          <Skeleton className="h-3 w-48" />
        </div>

        <div className="mb-4 flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-lg" />
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
          <div className="space-y-3 p-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
