import Link from "next/link";
import { guard } from "@/components/admin/guard";
import { Alert, Badge, Card, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import {
  CASE_STATUS_LABELS,
  HINT_TYPE_LABELS,
  PUBLICATION_STATUS_LABELS,
  REPORT_REASON_LABELS,
  SOURCE_TYPE_LABELS,
  SUBMISSION_STATUS_LABELS,
} from "@/lib/labels";
import { getActor } from "@/server/auth/actor";
import { getDashboard } from "@/server/services/dashboard";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ forbidden?: string }> }) {
  const actor = await getActor();
  const d = await guard(() => getDashboard(actor));
  const { forbidden } = await searchParams;

  const stats = [
    { label: "Neue Hinweise", value: d.counts.newHints, href: "/admin/hinweise?status=NEW" },
    { label: "Neue Fallmeldungen", value: d.counts.newSubmissions, href: "/admin/meldungen?status=SUBMITTED" },
    { label: "Zu prüfende Quellen", value: d.counts.unverifiedSources, href: "/admin/quellen" },
    { label: "Gemeldete Inhalte", value: d.counts.openReports, href: "/admin/inhalte" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Moderationsdashboard" lead={`Angemeldet als ${actor.user!.displayName}`} />
      {forbidden && <Alert tone="danger" title="Für diesen Bereich fehlt Ihnen die Berechtigung." />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-xl border border-line bg-surface p-4 text-ink no-underline hover:border-brand">
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-sm text-muted">{s.label}</p>
          </Link>
        ))}
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Offene Aufgaben</h2>
        {d.tasks.length ? (
          <ul className="divide-y divide-line">
            {d.tasks.map((t) => (
              <li key={t.key} className="flex items-center justify-between py-2">
                <Link href={t.href}>{t.label}</Link>
                <Badge tone="brand">{t.count}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Keine offenen Aufgaben.</p>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Neue Hinweise</h2>
          {d.newHints.length ? (
            <ul className="divide-y divide-line text-sm">
              {d.newHints.map((h) => (
                <li key={h.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <Link href={`/admin/hinweise/${h.id}`}>
                    {h.referenceCode} · {HINT_TYPE_LABELS[h.hintType]}
                  </Link>
                  <span className="text-muted">{h.case.publicNumber} · {formatDateTime(h.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Keine neuen Hinweise.</p>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Neue Fallmeldungen</h2>
          {d.newSubmissions.length ? (
            <ul className="divide-y divide-line text-sm">
              {d.newSubmissions.map((s) => (
                <li key={s.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <Link href={`/admin/meldungen/${s.id}`}>{s.referenceCode} · {s.personName}</Link>
                  <Badge>{SUBMISSION_STATUS_LABELS[s.status]}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Keine offenen Meldungen.</p>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Zu prüfende Quellen</h2>
          {d.unverifiedSources.length ? (
            <ul className="divide-y divide-line text-sm">
              {d.unverifiedSources.map((s) => (
                <li key={s.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <Link href={`/admin/faelle/${s.case.id}#quellen`}>{s.title}</Link>
                  <span className="text-muted">{SOURCE_TYPE_LABELS[s.sourceType]} · {s.case.publicNumber}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Alle Quellen geprüft.</p>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Gemeldete Inhalte</h2>
          {d.openReports.length ? (
            <ul className="divide-y divide-line text-sm">
              {d.openReports.map((r) => (
                <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <Link href={`/admin/inhalte#r-${r.id}`}>{REPORT_REASON_LABELS[r.reason]}</Link>
                  <span className="text-muted">{r.case.publicNumber} · {formatDateTime(r.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Keine offenen Meldungen.</p>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Zuletzt bearbeitete Fälle</h2>
        <ul className="divide-y divide-line text-sm">
          {d.recentCases.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <Link href={`/admin/faelle/${c.id}`}>
                {c.publicNumber} · {c.person.firstName} {c.person.lastName ?? ""}
              </Link>
              <span className="flex items-center gap-2 text-muted">
                <Badge>{CASE_STATUS_LABELS[c.status]}</Badge>
                <Badge tone={c.publicationStatus === "PUBLISHED" ? "found" : "neutral"}>{PUBLICATION_STATUS_LABELS[c.publicationStatus]}</Badge>
                {formatDateTime(c.updatedAt)}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
