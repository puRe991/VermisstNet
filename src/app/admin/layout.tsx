import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/public/auth-forms";
import { Logo } from "@/components/public/site-header";
import { ROLE_LABELS } from "@/lib/labels";
import { can, type Permission } from "@/lib/permissions";
import { getActor } from "@/server/auth/actor";

export const metadata: Metadata = { title: { default: "Moderation", template: "%s · Moderation · VermisstAtlas" }, robots: { index: false, follow: false } };

const NAV: { href: string; label: string; perm: Permission }[] = [
  { href: "/admin", label: "Dashboard", perm: "admin.access" },
  { href: "/admin/hinweise", label: "Hinweise", perm: "hint.read" },
  { href: "/admin/meldungen", label: "Fallmeldungen", perm: "submission.read" },
  { href: "/admin/faelle", label: "Fälle", perm: "case.read.internal" },
  { href: "/admin/quellen", label: "Quellen prüfen", perm: "source.verify" },
  { href: "/admin/inhalte", label: "Gemeldete Inhalte", perm: "report.moderate" },
  { href: "/admin/benutzer", label: "Benutzer & Rollen", perm: "user.manage" },
  { href: "/admin/audit", label: "Audit-Log", perm: "audit.read" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  if (!actor.user) redirect("/anmelden?next=/admin");
  if (!can(actor.user.role, "admin.access")) redirect("/konto");
  const nav = NAV.filter((n) => can(actor.user!.role, n.perm));

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-line bg-surface lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-2 p-4">
          <Logo />
        </div>
        <nav aria-label="Moderation" className="overflow-x-auto px-2 pb-3 lg:pb-0">
          <ul className="flex gap-1 lg:flex-col">
            {nav.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="block whitespace-nowrap rounded-md px-3 py-2 text-sm text-ink no-underline hover:bg-canvas">
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/" className="block whitespace-nowrap rounded-md px-3 py-2 text-sm text-muted no-underline hover:bg-canvas">
                ← Öffentliche Seite
              </Link>
            </li>
          </ul>
        </nav>
        <div className="hidden border-t border-line p-4 text-sm lg:block">
          <p className="font-semibold">{actor.user.displayName}</p>
          <p className="text-muted">{ROLE_LABELS[actor.user.role]}</p>
          <LogoutButton className="mt-3 w-full" />
        </div>
      </aside>
      <main id="inhalt" className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
