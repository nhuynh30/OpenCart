import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import NotificationBell from "./NotificationBell";
import StoreDropdown from "./StoreDropdown";

const TABS = [
  { label: "Overview",  href: "/seller/dashboard" },
  { label: "Products",  href: "/seller/products" },
  { label: "Orders",    href: "/seller/orders" },
  { label: "Analytics", href: "/seller/analytics" },
  { label: "Payouts",   href: "/seller/payouts" },
  { label: "Messages",  href: "/messages" },
] as const;

type Tab = (typeof TABS)[number]["label"];

export default function SellerHeader({
  storeName,
  storeId,
  email,
  activeTab,
}: {
  storeName: string;
  storeId: string;
  email: string;
  activeTab: Tab;
}) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between bg-white px-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-6">
        <Link href="/store" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black">
            <ShoppingBag className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold">OpenCart</span>
        </Link>

        <nav className="flex items-center gap-0.5">
          {TABS.map((tab) => (
            <Link
              key={tab.label}
              href={tab.href}
              className={`rounded-md px-2.5 py-1 text-sm ${
                tab.label === activeTab
                  ? "bg-gray-100 font-medium text-gray-900"
                  : "font-normal text-gray-400 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <StoreDropdown storeName={storeName} storeId={storeId} />
        <NotificationBell />
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600">
          {email[0].toUpperCase()}
        </div>
      </div>
    </header>
  );
}
