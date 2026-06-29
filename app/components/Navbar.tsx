"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <div className="flex items-center justify-between">
      <div>
        <Link href="/">
          <h1 className="text-3xl font-bold">OpenCart</h1>
        </Link>
        <p className="mt-1 text-sm text-gray-500">
          Browse products from all stores
        </p>
      </div>
      <div className="flex items-center gap-3">
        {session ? (
          <>
            <span className="text-sm text-gray-600">
              {session.user.email}
              <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs font-medium uppercase text-gray-600">
                {session.user.role}
              </span>
            </span>
            {session.user.role === "SELLER" && (
              <Link
                href="/seller"
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Seller Dashboard
              </Link>
            )}
            <button
              onClick={() => signOut()}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Create account
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
