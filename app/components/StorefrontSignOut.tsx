"use client";

import { signOut } from "next-auth/react";

export default function StorefrontSignOut() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/store" })}
      className="text-sm text-[#64748B] hover:text-[#0F172A]"
    >
      Sign out
    </button>
  );
}
