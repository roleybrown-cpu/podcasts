import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, getAdminToken } from "@/lib/auth";

export async function GET() {
  const adminToken = getAdminToken();
  if (!adminToken) {
    return NextResponse.json(
      { error: "Missing APP_ADMIN_TOKEN" },
      { status: 500 }
    );
  }

  const cookieStore = cookies();
  const cookie = cookieStore.get(AUTH_COOKIE_NAME);
  if (cookie?.value === "1") {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
