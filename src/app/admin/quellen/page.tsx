import Link from "next/link";
import { guard } from "@/components/admin/guard";
import { SourceVerifyButtons } from "@/components/admin/case-editor/source-actions";
import { EmptyState, PageHeader, Pagination } from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/format";
import { PUBLICATION_STATUS_LABELS, SOURCE_TYPE_LABELS } from "@/lib/labels";
import { getActor } from "@/server/auth/actor";
import { listSourcesAdmin } from "@/server/services/admin-sources";

export default async function SourcesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  const p = Math.max(1, Number(page) || 1);
  const actor = await getActor();
  const r = await guard(() => listSourcesAdmin(actor, { verified: false, page: p, pageSize: 25 }));
  return (
    <>
      <PageHeader title="Zu prüfende Quellen" lead="Nur verifizierte Quellen erscheinen öffentlich und erlauben eine Veröffentlichung." />
      {r.items.length ? (
        <ul className="space-y-3">
          {r.items.map((s) => (
            <li key={s.id} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="text-sm">
                  <p className="font-semibold">{s.title}</p>
                  <p className="text-muted">
                    {SOURCE_TYPE_LABELS[s.sourceType]}{s.organization ? ` · ${s.organization}` : ""}
                    {s.publicationDate ? ` · ${formatDate(s.publicationDate)}` : ""}
                  </p>
                  {s.url && <p><a href={s.url} target="_blank" rel="noopener noreferrer nofollow">{s.url}</a></p>}
                  {s.notes && <p className="mt-1 whitespace-pre-line">Notiz: {s.notes}</p>}
                  <p className="mt-1 text-muted">
                    Fall <Link href={`/admin/faelle/${s.case.id}#quellen`}>{s.case.publicNumber}</Link> ({PUBLICATION_STATUS_LABELS[s.case.publicationStatus]}) · angelegt {formatDateTime(s.createdAt)}
                    {s.createdBy ? ` von ${s.createdBy.displayName}` : ""}
                  </p>
                </div>
                <SourceVerifyButtons id={s.id} verified={false} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Alle Quellen sind geprüft" />
      )}
      <Pagination page={r.page} totalPages={r.totalPages} hrefFor={(n) => `/admin/quellen?page=${n}`} />
    </>
  );
}
