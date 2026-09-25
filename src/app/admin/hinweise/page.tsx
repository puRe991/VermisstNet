import Link from "next/link";
import { guard } from "@/components/admin/guard";
import { Badge, EmptyState, PageHeader, Pagination } from "@/components/ui";
import { HINT_STATUSES } from "@/lib/enums";
import { formatDateTime } from "@/lib/format";
import { HINT_STATUS_LABELS, HINT_TYPE_LABELS } from "@/lib/labels";
import { hintListSchema } from "@/lib/validation/admin";
import { getActor } from "@/server/auth/actor";
import { listHints } from "@/server/services/moderation";

export default async function HintsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const q = hintListSchema.parse({ status: sp.status ?? "", case: sp.case ?? "", page: sp.page ?? "" });
  const actor = await getActor();
  const r = await guard(() => listHints(actor, q));
  const href = (p: Record<string, string | number | undefined>) =>
    `/admin/hinweise?${new URLSearchParams(Object.entries({ status: q.status, case: q.case, ...p }).filter(([, v]) => v !== undefined && v !== "") as [string, string][]).toString()}`;

  return (
    <>
      <PageHeader title="Hinweise" lead="Hinweise sind ausschließlich intern sichtbar und werden nie veröffentlicht." />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href="/admin/hinweise" className={!q.status ? "font-bold" : ""}>Offen (ohne Archiv)</Link>
        {HINT_STATUSES.map((s) => (
          <Link key={s} href={href({ status: s, page: undefined })} className={q.status === s ? "font-bold" : ""}>
            {HINT_STATUS_LABELS[s]}
          </Link>
        ))}
      </div>
      {r.items.length ? (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="p-3">Referenz</th>
                <th className="p-3">Fall</th>
                <th className="p-3">Art</th>
                <th className="p-3">Eingang</th>
                <th className="p-3">Status</th>
                <th className="p-3">Anhänge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {r.items.map((h) => (
                <tr key={h.id}>
                  <td className="p-3"><Link href={`/admin/hinweise/${h.id}`} className="font-mono">{h.referenceCode}</Link></td>
                  <td className="p-3">{h.case.publicNumber}</td>
                  <td className="p-3">{HINT_TYPE_LABELS[h.hintType]}</td>
                  <td className="p-3 whitespace-nowrap">{formatDateTime(h.createdAt)}</td>
                  <td className="p-3"><Badge tone={h.status === "NEW" ? "brand" : "neutral"}>{HINT_STATUS_LABELS[h.status]}</Badge></td>
                  <td className="p-3">{h._count.attachments}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Keine Hinweise in dieser Ansicht" />
      )}
      <Pagination page={r.page} totalPages={r.totalPages} hrefFor={(p) => href({ page: p })} />
    </>
  );
}
