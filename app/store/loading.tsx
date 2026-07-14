import Skeleton from "@/app/components/Skeleton";

export default function StoreLoading() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-[#F1F5F9] bg-white">
        <div className="flex h-[46px] items-center justify-between px-4 sm:px-8">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      </header>

      <section className="bg-[#0F172A] px-4 pb-9 pt-10 sm:px-8">
        <Skeleton className="mb-3 h-3 w-40 bg-white/10" />
        <Skeleton className="mb-2 h-9 w-64 bg-white/10" />
        <Skeleton className="mb-6 h-4 w-72 bg-white/10" />
        <Skeleton className="h-10 w-full max-w-md bg-white/10" />
      </section>

      <div className="border-b border-[#F1F5F9] bg-white">
        <div className="flex items-center justify-between px-4 py-2.5 sm:px-8">
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-16 rounded-full" />
            ))}
          </div>
        </div>
      </div>

      <main className="bg-white px-4 py-6 sm:px-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-[8px] bg-[#F8FAFC]">
              <Skeleton className="w-full rounded-none" style={{ aspectRatio: "4/3" }} />
              <div className="space-y-2 px-3 pb-2.5 pt-2.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
