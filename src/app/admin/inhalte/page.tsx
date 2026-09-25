import Link from "next/link";
import { DecisionPanel } from "@/components/admin/decision-panel";
import { guard } from "@/components/admin/guard";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { REPORT_STATUSES } from "@/lib/enums";
import { formatDateTime } from "@/lib/format";
import { REPORT_REASON_LABELS, REPORT_STATUS_LABELS } from "@/lib/labels";
import { reportListSchema } from "@/lib/validation/admin";
import { getActor } from "@/server/auth/actor";
import { listReports } from "@/server/services/moderation";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const q = reportListSchema.parse({ status: sp.status ?? "", page: sp.page ?? "" });
  const actor = await getActor();
  const r = await guard(() => listReports(actor, q));
  return (
    <>
      <PageHeader title="Gemeldete Inhalte" lead="Hinweise der Öffentlichkeit auf fehlerhafte oder problematische Inhalte von Fallseiten." />
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link href="/admin/inhalte" className={!q.status ? "font-bold" : ""}>Offen</Link>
        {REPORT_STATUSES.map((s) => (
          <Link key={s} href={`/admin/inhalte?status=${s}`} className={q.status === s ? "font-bold" : ""}>{REPORT_STATUS_LABELS[s]}</Link>
        ))}
      </div>
      {r.items.length ? (
        <ul className="space-y-4">
          {r.items.map((x) => (
            <li key={x.id} id={`r-${x.id}`} className="rounded-xl border border-line bg-surface p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge tone="warn">{REPORT_REASON_LABELS[x.reason]}</Badge>
                <Badge>{REPORT_STATUS_LABELS[x.status]}</Badge>
                <span className="text-sm text-muted">
                  Fall <Link href={`/admin/faelle/${x.case.id}`}>{x.case.publicNumber}</Link> · {formatDateTime(x.createdAt)}
                </span>
              </div>
              <p className="whitespace-pre-line">{x.message}</p>
              {(x.status === "OPEN" || x.status === "IN_PROGRESS") && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-semibold">Bearbeiten</summary>
                  <div className="mt-3">
                    <DecisionPanel endpoint={`/api/admin/reports/${x.id}`} decisions={["CONFIRM", "DEFER", "FORWARD", "REJECT"]} confirmLabel="Erledigt" />
                  </div>
                </details>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Keine gemeldeten Inhalte" />
      )}
    </>
  );
}
