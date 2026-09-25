import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/validation/public";
import { sessionCookieName, sessionCookieOptions } from "@/server/auth/session";
import { apiHandler, parseWith, readJson } from "@/server/http";
import { login } from "@/server/services/auth";

export const POST = apiHandler(async ({ req, actor }) => {
  const input = parseWith(loginSchema, await readJson(req));
  const { token, expiresAt, user } = await login(actor, input);
  const res = NextResponse.json({ user: { displayName: user.displayName, role: user.role } });
  res.cookies.set(sessionCookieName(), token, sessionCookieOptions(expiresAt));
  res.headers.set("Cache-Control", "no-store");
  return res;
});
