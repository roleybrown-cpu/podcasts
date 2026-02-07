import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAuthorizedRequest } from "./lib/auth";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  if (pathname === "/api/login" || pathname === "/api/session") {
    return NextResponse.next();
  }

  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"]
};
