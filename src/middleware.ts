import { NextResponse, type NextRequest } from "next/server";
import { isSameOriginRequest } from "@/lib/csrf";
import { sessionCookieName } from "@/lib/session-cookie";

/**
 * Middleware (Edge Runtime):
 *  1. CSRF: mutierende /api-Anfragen nur von der eigenen Origin
 *  2. Security-Header inkl. Content-Security-Policy mit Nonce
 *  3. /admin ohne Session-Cookie → Login (Defense in Depth; maßgeblich ist der Service-Layer)
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProd = process.env.NODE_ENV === "production";

  if (pathname.startsWith("/api/")) {
    const allowedOrigins = [req.nextUrl.origin];
    if (process.env.APP_URL) allowedOrigins.push(process.env.APP_URL);
    const ok = isSameOriginRequest({
      method: req.method,
      origin: req.headers.get("origin"),
      referer: req.headers.get("referer"),
      allowedOrigins,
    });
    if (!ok) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Ungültige Herkunft der Anfrage" } },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }
    const res = NextResponse.next();
    res.headers.set("X-Content-Type-Options", "nosniff");
    return res;
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/konto")) {
    if (!req.cookies.get(sessionCookieName())) {
      const url = req.nextUrl.clone();
      url.pathname = "/anmelden";
      url.search = `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
  }

  const nonce = btoa(crypto.randomUUID());
  const tileHost = tileOrigin(process.env.NEXT_PUBLIC_TILE_URL);
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isProd ? "" : " 'unsafe-eval'"}`,
    // Leaflet und Next setzen Inline-Styles
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:${tileHost ? ` ${tileHost}` : ""}`,
    `font-src 'self'`,
    `connect-src 'self'${isProd ? "" : " ws: wss:"}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    ...(isProd && process.env.APP_URL?.startsWith("https:") ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

/** "https://tile.openstreetmap.org/{z}/{x}/{y}.png" → "https://tile.openstreetmap.org" (inkl. Subdomain-Platzhalter) */
function tileOrigin(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.replace(/\{s\}/g, "a").replace(/\{[a-z]\}/g, "0"));
    return url.includes("{s}") ? `${u.protocol}//*.${u.host.split(".").slice(1).join(".")}` : u.origin;
  } catch {
    return null;
  }
}

export const config = {
  matcher: [
    // Alles außer statischen Assets
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)",
  ],
};
