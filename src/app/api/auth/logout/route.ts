import { NextResponse } from "next/server";
import { invalidateSessionToken, sessionCookieName } from "@/server/auth/session";
import { apiHandler } from "@/server/http";

export const POST = apiHandler(async ({ req }) => {
  await invalidateSessionToken(req.cookies.get(sessionCookieName())?.value);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookieName(), "", { ...{ httpOnly: true, sameSite: "lax", path: "/" }, secure: process.env.NODE_ENV === "production", maxAge: 0 });
  res.headers.set("Cache-Control", "no-store");
  return res;
});
