import Link from "next/link";
import { guard } from "@/components/admin/guard";
import { Badge, EmptyState, PageHeader, Pagination } from "@/components/ui";
import { SUBMISSION_STATUSES } from "@/lib/enums";
import { formatDate, formatDateTime } from "@/lib/format";
import { SUBMISSION_STATUS_LABELS } from "@/lib/labels";
import { submissionListSchema } from "@/lib/validation/admin";
import { getActor } from "@/server/auth/actor";
import { listSubmissions } from "@/server/services/moderation";

export default async function SubmissionsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const q = submissionListSchema.parse({ status: sp.status ?? "", page: sp.page ?? "" });
  const actor = await getActor();
  const r = await guard(() => listSubmissions(actor, q));
  return (
    <>
      <PageHeader title="Fallmeldungen" lead="SUBMITTED → REVIEW → SOURCE_VERIFICATION → APPROVED (Fallentwurf) → PUBLISHED" />
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link href="/admin/meldungen" className={!q.status ? "font-bold" : ""}>Alle</Link>
        {SUBMISSION_STATUSES.map((s) => (
          <Link key={s} href={`/admin/meldungen?status=${s}`} className={q.status === s ? "font-bold" : ""}>{SUBMISSION_STATUS_LABELS[s]}</Link>
        ))}
      </div>
      {r.items.length ? (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr><th className="p-3">Referenz</th><th className="p-3">Person</th><th className="p-3">Vermisst seit</th><th className="p-3">Ort</th><th className="p-3">Eingang</th><th className="p-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {r.items.map((s) => (
                <tr key={s.id}>
                  <td className="p-3"><Link href={`/admin/meldungen/${s.id}`} className="font-mono">{s.referenceCode}</Link></td>
                  <td className="p-3">{s.personName}{s.age !== null ? `, ${s.age}` : ""}</td>
                  <td className="p-3">{formatDate(s.missingSince)}</td>
                  <td className="p-3">{s.missingPlace}</td>
                  <td className="p-3 whitespace-nowrap">{formatDateTime(s.createdAt)}</td>
                  <td className="p-3"><Badge tone={s.status === "SUBMITTED" ? "brand" : "neutral"}>{SUBMISSION_STATUS_LABELS[s.status]}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Keine Meldungen in dieser Ansicht" />
      )}
      <Pagination page={r.page} totalPages={r.totalPages} hrefFor={(p) => `/admin/meldungen?${new URLSearchParams({ ...(q.status ? { status: q.status } : {}), page: String(p) })}`} />
    </>
  );
}
