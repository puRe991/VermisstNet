import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/validation/public";
import { sessionCookieName, sessionCookieOptions } from "@/server/auth/session";
import { apiHandler, parseWith, readJson } from "@/server/http";
import { register } from "@/server/services/auth";

export const POST = apiHandler(async ({ req, actor }) => {
  const input = parseWith(registerSchema, await readJson(req));
  const { token, expiresAt } = await register(actor, input);
  const res = NextResponse.json({ ok: true }, { status: 201 });
  res.cookies.set(sessionCookieName(), token, sessionCookieOptions(expiresAt));
  res.headers.set("Cache-Control", "no-store");
  return res;
});
