import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ShoppingBag, Bell, ChevronDown, ChevronRight } from "lucide-react";
import NewProductForm from "./NewProductForm";

export default async function NewProductPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SELLER") redirect("/store");

  const store = await prisma.store.findUnique({
    where: { sellerId: session.user.id },
  });
  if (!store) redirect("/seller/store/create");

  return (
    <div className="force-light min-h-screen bg-[#F1F5F9]">
      {/* Top Nav */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between bg-white px-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-6">
          <Link href="/store" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black">
              <ShoppingBag className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold">OpenCart</span>
          </Link>
          <nav className="flex items-center gap-0.5">
            {[
              { label: "Overview", href: "/seller/dashboard" },
              { label: "Products", href: "/seller/products" },
              { label: "Orders", href: "/seller/dashboard" },
              { label: "Analytics", href: "/seller/dashboard" },
              { label: "Payouts", href: "/seller/dashboard" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`rounded-md px-2.5 py-1 text-sm ${
                  item.label === "Products"
                    ? "bg-gray-100 font-medium text-gray-900"
                    : "font-normal text-gray-400 hover:text-gray-700"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
            <span>🏪</span>
            <span>{store.name}</span>
            <ChevronDown className="h-3 w-3 text-gray-400" />
          </div>
          <button className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 text-gray-400 hover:bg-gray-200">
            <Bell className="h-3.5 w-3.5" />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600">
            {session.user.email?.[0].toUpperCase()}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-1.5 text-sm text-gray-400">
          <Link href="/seller/products" className="hover:text-gray-700">Products</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-gray-700">Add product</span>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Add product</h1>
          <p className="mt-1 text-sm text-gray-400">List a new product in your store.</p>
        </div>

        <NewProductForm />
      </main>
    </div>
  );
}
