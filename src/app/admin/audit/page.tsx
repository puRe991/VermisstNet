import { guard } from "@/components/admin/guard";
import { EmptyState, PageHeader, Pagination } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { auditListSchema } from "@/lib/validation/admin";
import { getActor } from "@/server/auth/actor";
import { listAudit } from "@/server/services/admin-users";

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const q = auditListSchema.parse({ entityType: sp.entityType ?? "", entityId: sp.entityId ?? "", actor: sp.actor ?? "", page: sp.page ?? "", pageSize: "50" });
  const actor = await getActor();
  const r = await guard(() => listAudit(actor, q));
  return (
    <>
      <PageHeader title="Audit-Log" lead="Unveränderliches Protokoll aller administrativen Änderungen." />
      <form className="mb-4 flex flex-wrap gap-2 text-sm" method="get">
        <input name="entityType" placeholder="Objekttyp (z. B. Case)" defaultValue={q.entityType ?? ""} className="input max-w-xs" />
        <input name="entityId" placeholder="Objekt-ID" defaultValue={q.entityId ?? ""} className="input max-w-sm" />
        <button className="rounded-lg border border-line px-4">Filtern</button>
      </form>
      {r.items.length ? (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr><th className="p-3">Zeitpunkt</th><th className="p-3">Benutzer</th><th className="p-3">Aktion</th><th className="p-3">Beschreibung</th><th className="p-3">Änderungen</th></tr>
            </thead>
            <tbody className="divide-y divide-line align-top">
              {r.items.map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap p-3">{formatDateTime(a.createdAt)}</td>
                  <td className="p-3">{a.actorLabel}</td>
                  <td className="p-3 font-mono text-xs">{a.action}</td>
                  <td className="p-3">{a.summary}<div className="text-xs text-muted">{a.entityType} {a.entityId}</div></td>
                  <td className="p-3">
                    {(a.oldData || a.newData) && (
                      <details>
                        <summary className="cursor-pointer text-xs">anzeigen</summary>
                        <pre className="mt-1 max-w-md overflow-x-auto whitespace-pre-wrap text-xs">alt: {JSON.stringify(a.oldData, null, 1)}{"\n"}neu: {JSON.stringify(a.newData, null, 1)}</pre>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Keine Einträge" />
      )}
      <Pagination page={r.page} totalPages={r.totalPages} hrefFor={(p) => `/admin/audit?${new URLSearchParams({ ...(q.entityType ? { entityType: q.entityType } : {}), ...(q.entityId ? { entityId: q.entityId } : {}), page: String(p) })}`} />
    </>
  );
}
