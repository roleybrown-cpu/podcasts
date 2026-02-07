import type { NextRequest } from "next/server";

export const AUTH_COOKIE_NAME = "ps_rag_auth";

export function getAdminToken() {
  return process.env.APP_ADMIN_TOKEN || "";
}

export function getActionKey() {
  return process.env.APP_ACTION_KEY || "";
}

function parseBearer(token: string | null) {
  if (!token) return "";
  const match = token.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

export function isAuthorizedRequest(req: NextRequest) {
  const adminToken = getAdminToken();
  const actionKey = getActionKey();
  if (!adminToken && !actionKey) return false;

  const bearer = parseBearer(req.headers.get("authorization"));
  if (actionKey && bearer && bearer === actionKey) return true;

  const headerToken = req.headers.get("x-admin-token");
  if (headerToken && headerToken === adminToken) return true;

  const cookie = req.cookies.get(AUTH_COOKIE_NAME);
  return cookie?.value === "1";
}
