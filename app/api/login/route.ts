import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, getAdminToken } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json();
  const token = String(body.token || "").trim();
  const adminToken = getAdminToken();

  if (!adminToken) {
    return NextResponse.json(
      { error: "Missing APP_ADMIN_TOKEN" },
      { status: 500 }
    );
  }

  if (!token || token !== adminToken) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const cookieStore = cookies();
  cookieStore.set(AUTH_COOKIE_NAME, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return NextResponse.json({ ok: true });
}
