import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "VermisstAtlas", template: "%s · VermisstAtlas" },
  description:
    "VermisstAtlas – verifizierte Vermisstenfälle strukturiert, nachvollziehbar und datenschutzfreundlich dargestellt.",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1d4e6e",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Nonce-basierte CSP erfordert dynamisches Rendering; Next setzt den Nonce automatisch an eigene Skripte.
  await headers();
  return (
    <html lang="de">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
