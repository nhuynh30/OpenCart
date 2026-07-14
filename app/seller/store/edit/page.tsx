import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SellerHeader from "../../SellerHeader";
import Link from "next/link";
import EditStoreForm from "./EditStoreForm";

export default async function EditStorePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SELLER") redirect("/store");

  const store = await prisma.store.findUnique({
    where: { sellerId: session.user.id },
  });
  if (!store) redirect("/seller/store/create");

  return (
    <div className="force-light min-h-screen bg-[#F1F5F9]">
      <SellerHeader
        storeName={store.name}
        storeId={store.id}
        email={session.user.email!}
        activeTab="Overview"
      />

      <main className="mx-auto max-w-2xl px-6 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-gray-400">
          <Link href="/seller/dashboard" className="hover:text-gray-700">Dashboard</Link>
          <span>/</span>
          <span className="text-gray-700">Edit store info</span>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Edit store info</h1>
          <p className="mt-1 text-sm text-gray-400">
            Update your store name and description that buyers see on your public store page.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          {/* Store avatar preview */}
          <div className="mb-6 flex items-center gap-4 rounded-xl bg-[#F8FAFC] px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F172A] text-base font-bold text-white">
              {store.name[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{store.name}</p>
              <Link
                href={`/stores/${store.id}`}
                target="_blank"
                className="text-xs text-[#94A3B8] hover:text-[#0F172A]"
              >
                /stores/{store.id.slice(0, 8)}… ↗
              </Link>
            </div>
          </div>

          <EditStoreForm
            storeId={store.id}
            initialName={store.name}
            initialDescription={store.description ?? ""}
          />
        </div>
      </main>
    </div>
  );
}
