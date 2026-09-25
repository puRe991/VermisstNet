import Link from "next/link";
import { can } from "@/lib/permissions";
import { getActor } from "@/server/auth/actor";

const NAV = [
  { href: "/", label: "Startseite" },
  { href: "/faelle", label: "Vermisstenfälle" },
  { href: "/karte", label: "Karte" },
  { href: "/hinweis", label: "Hinweis melden" },
  { href: "/melden", label: "Vermisstenfall melden" },
  { href: "/ueber", label: "Über das Projekt" },
];

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-bold text-ink no-underline" aria-label="VermisstAtlas – Startseite">
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="15" fill="#1d4e6e" />
        <path d="M16 7a7 7 0 0 0-7 7c0 5.2 7 11 7 11s7-5.8 7-11a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 16 11.5a2.5 2.5 0 0 1 0 5z" fill="#fff" />
      </svg>
      <span className="text-lg tracking-tight">VermisstAtlas</span>
    </Link>
  );
}

export async function SiteHeader() {
  const actor = await getActor();
  const role = actor.user?.role ?? null;
  const accountLink = actor.user
    ? can(role, "admin.access")
      ? { href: "/admin", label: "Moderation" }
      : { href: "/konto", label: "Mein Konto" }
    : { href: "/anmelden", label: "Anmelden" };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
      <a href="#inhalt" className="skip-link">
        Zum Inhalt springen
      </a>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Logo />
        <nav aria-label="Hauptnavigation" className="hidden lg:block">
          <ul className="flex items-center gap-1 text-sm">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="rounded-md px-3 py-2 text-ink no-underline hover:bg-canvas">
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href={accountLink.href} className="ml-2 rounded-md border border-line px-3 py-2 text-brand no-underline hover:bg-brand-soft">
                {accountLink.label}
              </Link>
            </li>
          </ul>
        </nav>
        {/* Mobile Navigation ohne JavaScript (details/summary) */}
        <details className="relative lg:hidden">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center rounded-md border border-line px-3 text-sm font-semibold">
            Menü
          </summary>
          <nav aria-label="Hauptnavigation mobil" className="absolute right-0 mt-2 w-64 rounded-lg border border-line bg-surface p-2 shadow-lg">
            <ul className="flex flex-col">
              {[...NAV, accountLink].map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="block rounded-md px-3 py-3 text-ink no-underline hover:bg-canvas">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </details>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm text-muted sm:grid-cols-3">
        <div>
          <p className="font-semibold text-ink">VermisstAtlas</p>
          <p className="mt-1">Verifizierte Vermisstenfälle – strukturiert, nachvollziehbar, datenschutzfreundlich.</p>
        </div>
        <div>
          <p className="font-semibold text-ink">Im Notfall</p>
          <p className="mt-1">
            Wenn Sie eine vermisste Person gerade sehen oder Gefahr besteht, rufen Sie sofort den Notruf <strong>110</strong>.
          </p>
        </div>
        <nav aria-label="Rechtliches">
          <ul className="space-y-1">
            <li><Link href="/ueber">Über das Projekt</Link></li>
            <li><Link href="/datenschutz">Datenschutz</Link></li>
            <li><Link href="/impressum">Impressum</Link></li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
