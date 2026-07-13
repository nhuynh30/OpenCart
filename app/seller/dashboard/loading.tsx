import Skeleton from "@/app/components/Skeleton";

export default function SellerDashboardLoading() {
  return (
    <div className="force-light flex h-screen flex-col overflow-hidden bg-[#F1F5F9]">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-100 bg-white px-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-72 shrink-0 flex-col border-r border-gray-100 bg-white p-5">
          <Skeleton className="mb-4 h-28 w-full rounded-xl" />
          <Skeleton className="mb-2 h-3 w-24" />
          <div className="mb-4 space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
          <Skeleton className="mb-2 h-3 w-24" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <Skeleton className="mb-2 h-5 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
            <div className="border-b border-gray-100 px-5 py-3.5">
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
