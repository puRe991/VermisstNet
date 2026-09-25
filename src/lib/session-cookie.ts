/**
 * Name/Sicherheit des Session-Cookies (Edge- und Node-kompatibel, von Middleware und Server genutzt).
 * - APP_URL mit https://  → "__Host-va_session" + Secure (Produktion)
 * - APP_URL mit http://   → "va_session" ohne Secure (lokale Tests, auch im Produktionsmodus;
 *   ältere Browser wie Chrome 109 verwerfen Secure-Cookies auf http://localhost)
 * - APP_URL nicht gesetzt → sicher, wenn NODE_ENV=production
 */
export function sessionCookieIsSecure(): boolean {
  const appUrl = process.env.APP_URL;
  if (appUrl) return appUrl.startsWith("https://");
  return process.env.NODE_ENV === "production";
}

export function sessionCookieName(): string {
  return sessionCookieIsSecure() ? "__Host-va_session" : "va_session";
}
