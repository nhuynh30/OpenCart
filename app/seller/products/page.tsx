import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProductsClient from "./ProductsClient";
import SellerHeader from "../SellerHeader";

export const revalidate = 0;

export default async function SellerProductsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SELLER") redirect("/");

  const store = await prisma.store.findUnique({
    where: { sellerId: session.user.id },
  });
  if (!store) redirect("/seller/store/create");

  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="force-light min-h-screen bg-[#F1F5F9]">
      <SellerHeader storeName={store.name} storeId={store.id} email={session.user.email!} activeTab="Products" />

      <main className="mx-auto max-w-5xl px-6 py-8">
        <ProductsClient products={products} />
      </main>
    </div>
  );
}
