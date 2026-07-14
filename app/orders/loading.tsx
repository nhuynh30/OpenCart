import Skeleton from "@/app/components/Skeleton";

export default function OrdersLoading() {
  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <header className="bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-40" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6">
          <Skeleton className="mb-2 h-5 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>

        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
              <div className="flex items-center justify-between border-b border-gray-50 px-5 py-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <div className="space-y-3 px-5 py-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
