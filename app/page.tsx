import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ShoppingBag, Store, ShieldCheck, MessageCircle, Star } from "lucide-react";
import StorefrontSignOut from "./components/StorefrontSignOut";

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  const isSeller = session?.user?.role === "SELLER";

  const primaryHref = isSeller ? "/seller/dashboard" : "/store";
  const primaryLabel = isSeller ? "Go to dashboard" : "Browse the store";

  return (
    <div className="min-h-screen bg-white">
      {/* Demo notice */}
      <div className="bg-amber-50 px-8 py-2 text-center text-xs text-amber-800">
        This is a demo project — no real payments are processed. Checkout runs in Stripe test mode only.
      </div>

      {/* Nav */}
      <header className="border-b border-[#F1F5F9] bg-white">
        <div className="mx-auto flex h-[46px] max-w-6xl items-center justify-between px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0F172A]">
              <ShoppingBag className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-medium text-[#0F172A]">OpenCart</span>
          </Link>
          <div className="flex items-center gap-4">
            {session ? (
              <>
                <span className="hidden text-xs text-[#64748B] sm:block">{session.user.email}</span>
                <Link href={primaryHref} className="text-xs text-[#64748B] hover:text-[#0F172A]">
                  {isSeller ? "Dashboard" : "Store"}
                </Link>
                <StorefrontSignOut />
              </>
            ) : (
              <>
                <Link href="/login" className="text-xs text-[#64748B] hover:text-[#0F172A]">
                  Sign in
                </Link>
                <Link href="/register" className="text-xs font-medium text-[#0F172A] hover:underline">
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative bg-[#0F172A] px-8 py-24"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-[10px] font-medium uppercase tracking-[.14em] text-white/30">
            A marketplace for independent sellers
          </p>
          <h1 className="mb-5 text-5xl font-normal leading-tight tracking-tight text-white">
            Everything for sale,{" "}
            <em className="italic text-white/30">all in one place.</em>
          </h1>
          <p className="mx-auto mb-9 max-w-xl text-base text-white/40">
            OpenCart brings independent sellers and shoppers together — browse products
            from dozens of stores, message sellers directly, and check out securely in
            one cart.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href={primaryHref}
              className="rounded-xl bg-white px-6 py-3 text-sm font-medium text-[#0F172A] hover:bg-white/90"
            >
              {primaryLabel}
            </Link>
            {!session && (
              <Link
                href="/register"
                className="rounded-xl border border-white/15 px-6 py-3 text-sm font-medium text-white hover:bg-white/5"
              >
                Start selling
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-8 py-20">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F1F5F9]">
              <Store className="h-4.5 w-4.5 text-[#0F172A]" />
            </div>
            <h3 className="mb-1.5 text-sm font-semibold text-[#0F172A]">Shop every store</h3>
            <p className="text-sm leading-relaxed text-[#64748B]">
              Browse products from every seller on OpenCart in a single marketplace, or
              visit a store's own page.
            </p>
          </div>
          <div>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F1F5F9]">
              <ShieldCheck className="h-4.5 w-4.5 text-[#0F172A]" />
            </div>
            <h3 className="mb-1.5 text-sm font-semibold text-[#0F172A]">Secure checkout</h3>
            <p className="text-sm leading-relaxed text-[#64748B]">
              Payments are processed securely with Stripe, with funds going straight to
              the seller.
            </p>
          </div>
          <div>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F1F5F9]">
              <MessageCircle className="h-4.5 w-4.5 text-[#0F172A]" />
            </div>
            <h3 className="mb-1.5 text-sm font-semibold text-[#0F172A]">Message sellers</h3>
            <p className="text-sm leading-relaxed text-[#64748B]">
              Ask questions before you buy, and stay in touch about your order after.
            </p>
          </div>
          <div>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F1F5F9]">
              <Star className="h-4.5 w-4.5 text-[#0F172A]" />
            </div>
            <h3 className="mb-1.5 text-sm font-semibold text-[#0F172A]">Reviews you can trust</h3>
            <p className="text-sm leading-relaxed text-[#64748B]">
              Every product shows ratings from verified buyers, so you know what you're
              getting.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-[#F1F5F9] bg-[#F8FAFC] px-8 py-16 text-center">
        <h2 className="mb-3 text-2xl font-normal tracking-tight text-[#0F172A]">
          Ready to take a look?
        </h2>
        <p className="mb-7 text-sm text-[#64748B]">
          No account needed to browse — sign up when you're ready to buy or sell.
        </p>
        <Link
          href={primaryHref}
          className="inline-block rounded-xl bg-[#0F172A] px-6 py-3 text-sm font-medium text-white hover:bg-[#1E293B]"
        >
          {primaryLabel}
        </Link>
      </section>
    </div>
  );
}
