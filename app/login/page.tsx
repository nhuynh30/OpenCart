"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, ShoppingBag, Rocket, Tag, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/store";
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", { email, password, redirect: false });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left panel */}
      <div className="relative hidden flex-col justify-between bg-[#0f172a] p-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white">
            <ShoppingBag className="h-4.5 w-4.5 text-[#0f172a]" />
          </div>
          <span className="text-lg font-semibold text-white">OpenCart</span>
        </div>

        <div className="relative">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">
            Welcome back
          </p>
          <h1 className="text-5xl font-bold leading-tight text-white">
            Good to see
            <br />
            <span className="text-white/40">you again.</span>
          </h1>
          <p className="mt-6 text-sm leading-relaxed text-white/50">
            Sign in to manage your store, track your orders,
            or browse the latest products.
          </p>

          <div className="mt-10 space-y-4">
            {[
              { icon: Rocket,      text: "Free to join", sub: "no monthly fees, only a small 3% fee per sale" },
              { icon: Tag,         text: "List anything", sub: "clothing, electronics, household, jewelry and more" },
              { icon: ShieldCheck, text: "Buyer protection", sub: "every purchase is secured through Stripe Checkout" },
            ].map(({ icon: Icon, text, sub }) => (
              <div key={text} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-3.5 w-3.5 text-white/60" />
                </div>
                <p className="text-sm text-white/60">
                  <span className="font-medium text-white/90">{text}</span> — {sub}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/20">© 2026 OpenCart</p>
      </div>

      {/* Right panel */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black">
              <ShoppingBag className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold">OpenCart</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
          <p className="mt-1 text-sm text-gray-400">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-11 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#0f172a] py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>

            <p className="text-center text-sm text-gray-400">
              Don&apos;t have an account?{" "}
              <Link
                href={redirectTo !== "/store" ? `/register?redirect=${encodeURIComponent(redirectTo)}` : "/register"}
                className="font-semibold text-gray-900 hover:underline"
              >
                Create one
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
