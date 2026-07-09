import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/seller") || pathname.startsWith("/admin")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  if (pathname.startsWith("/seller") && token?.role !== "SELLER") {
    return NextResponse.redirect(new URL("/store", req.url));
  }

  if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/store", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/seller/:path*", "/admin/:path*"],
};
