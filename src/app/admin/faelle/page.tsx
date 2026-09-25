import Link from "next/link";
import { guard } from "@/components/admin/guard";
import { Badge, ButtonLink, DemoBadge, EmptyState, PageHeader, Pagination } from "@/components/ui";
import { CASE_STATUSES, PUBLICATION_STATUSES } from "@/lib/enums";
import { formatDate, formatDateTime } from "@/lib/format";
import { CASE_STATUS_LABELS, PUBLICATION_STATUS_LABELS } from "@/lib/labels";
import { can } from "@/lib/permissions";
import { adminCaseListSchema } from "@/lib/validation/admin";
import { getActor } from "@/server/auth/actor";
import { listCasesAdmin } from "@/server/services/admin-cases";

export default async function AdminCasesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const parsed = adminCaseListSchema.safeParse({ q: sp.q ?? "", status: sp.status ?? "", publication: sp.publication ?? "", page: sp.page ?? "" });
  const q = parsed.success ? parsed.data : adminCaseListSchema.parse({});
  const actor = await getActor();
  const r = await guard(() => listCasesAdmin(actor, q));
  const qs = (page: number) =>
    new URLSearchParams(Object.entries({ q: q.q, status: q.status, publication: q.publication, page: String(page) }).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <>
      <PageHeader title="Fälle" lead="Alle Fälle inkl. Entwürfe und archivierter Fälle.">
        {can(actor.user!.role, "case.create") && <ButtonLink href="/admin/faelle/neu">Neuen Fall anlegen</ButtonLink>}
      </PageHeader>
      <form method="get" className="mb-4 grid gap-2 sm:grid-cols-4">
        <input name="q" defaultValue={q.q ?? ""} placeholder="Name, Ort, Fallnummer, Aktenzeichen" className="input sm:col-span-2" />
        <select name="status" defaultValue={q.status ?? ""} className="input">
          <option value="">Alle Status</option>
          {CASE_STATUSES.map((s) => <option key={s} value={s}>{CASE_STATUS_LABELS[s]}</option>)}
        </select>
        <select name="publication" defaultValue={q.publication ?? ""} className="input">
          <option value="">Alle Veröffentlichungsstände</option>
          {PUBLICATION_STATUSES.map((s) => <option key={s} value={s}>{PUBLICATION_STATUS_LABELS[s]}</option>)}
        </select>
        <button className="min-h-[44px] rounded-lg border border-line px-4 sm:col-span-4 sm:justify-self-start">Filtern</button>
      </form>
      {r.items.length ? (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr><th className="p-3">Fallnummer</th><th className="p-3">Person</th><th className="p-3">Vermisst seit</th><th className="p-3">Ort</th><th className="p-3">Status</th><th className="p-3">Offene Hinweise</th><th className="p-3">Geändert</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {r.items.map((c) => (
                <tr key={c.id}>
                  <td className="p-3 whitespace-nowrap"><Link href={`/admin/faelle/${c.id}`}>{c.publicNumber}</Link> {c.isDemo && <DemoBadge />}</td>
                  <td className="p-3">{c.person.firstName} {c.person.lastName ?? ""}</td>
                  <td className="p-3">{formatDate(c.missingSince)}</td>
                  <td className="p-3">{c.missingPlace}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      <Badge>{CASE_STATUS_LABELS[c.status]}</Badge>
                      <Badge tone={c.publicationStatus === "PUBLISHED" ? "found" : "neutral"}>{PUBLICATION_STATUS_LABELS[c.publicationStatus]}</Badge>
                      {c.isUrgent && <Badge tone="urgent">dringend</Badge>}
                    </div>
                  </td>
                  <td className="p-3">{c._count.hints}</td>
                  <td className="p-3 whitespace-nowrap">{formatDateTime(c.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Keine Fälle gefunden" />
      )}
      <Pagination page={r.page} totalPages={r.totalPages} hrefFor={(p) => `/admin/faelle?${qs(p)}`} />
    </>
  );
}
