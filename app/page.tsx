"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div>
          <h1 className="text-3xl font-bold">OpenCart</h1>
          <p className="mt-2 text-sm text-gray-500">
            A marketplace for buyers and sellers
          </p>
        </div>

        {session ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Signed in as <span className="font-medium">{session.user.email}</span>
              <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs font-medium uppercase text-gray-600">
                {session.user.role}
              </span>
            </p>

            <div className="flex flex-col gap-3">
              {session.user.role === "SELLER" && (
                <button
                  onClick={() => router.push("/seller/onboarding")}
                  className="w-full rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
                >
                  Seller Dashboard
                </button>
              )}
              <button
                onClick={() => signOut()}
                className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50"
              >
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push("/login")}
              className="w-full rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              Sign in
            </button>
            <button
              onClick={() => router.push("/register")}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50"
            >
              Create account
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
