import Link from "next/link";
import { Attachments } from "@/components/admin/attachments";
import { DecisionPanel } from "@/components/admin/decision-panel";
import { EraseButton } from "@/components/admin/erase-button";
import { guard } from "@/components/admin/guard";
import { History } from "@/components/admin/history";
import { Badge, Card, DefinitionList, PageHeader } from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/format";
import { DECISION_LABELS, HINT_STATUS_LABELS, HINT_TYPE_LABELS } from "@/lib/labels";
import { can } from "@/lib/permissions";
import { getActor } from "@/server/auth/actor";
import { uuidParam } from "@/server/http";
import { getHint } from "@/server/services/moderation";

export default async function HintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getActor();
  const h = await guard(async () => getHint(actor, uuidParam(id)));

  return (
    <div className="space-y-6">
      <PageHeader title={`Hinweis ${h.referenceCode}`} lead={<>Zu Fall <Link href={`/admin/faelle/${h.case.id}`}>{h.case.publicNumber}</Link> ({h.case.person.firstName} {h.case.person.lastName})</>}>
        <Badge tone="brand">{HINT_STATUS_LABELS[h.status]}</Badge>
        {h.lastDecision && <Badge>Letzte Entscheidung: {DECISION_LABELS[h.lastDecision]}</Badge>}
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 text-lg font-semibold">Eingabe</h2>
            <DefinitionList
              items={[
                { label: "Eingegangen", value: formatDateTime(h.createdAt) },
                { label: "Art", value: HINT_TYPE_LABELS[h.hintType] },
                { label: "Beobachtungsdatum", value: h.observedDate ? formatDate(h.observedDate) : null },
                { label: "Uhrzeit", value: h.observedTime },
                { label: "Ort", value: h.locationText },
                { label: "Koordinaten", value: h.latitude !== null ? `${h.latitude}, ${h.longitude}` : null },
                { label: "Anonym", value: h.isAnonymous ? "ja" : "nein" },
                { label: "Kontakt", value: h.contact ?? (h.personalDataErasedAt ? "gelöscht" : "keine Angabe") },
                { label: "Konto", value: h.reporter ? `${h.reporter.displayName} (${h.reporter.email})` : null },
                { label: "Zuständig", value: h.assignee?.displayName ?? null },
              ]}
            />
            <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-muted">Beschreibung</h3>
            <p className="mt-1 whitespace-pre-line">{h.description}</p>
          </Card>
          <Card>
            <h2 className="mb-3 text-lg font-semibold">Anhänge</h2>
            <Attachments items={h.attachments} />
          </Card>
          <Card>
            <h2 className="mb-3 text-lg font-semibold">Ursprüngliche Eingabe (unverändert)</h2>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-canvas p-3 text-xs">{JSON.stringify(h.originalPayload, null, 2)}</pre>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 text-lg font-semibold">Entscheidung</h2>
            <DecisionPanel endpoint={`/api/admin/hints/${h.id}`} />
          </Card>
          <Card>
            <h2 className="mb-3 text-lg font-semibold">Bearbeitungsverlauf</h2>
            <History events={h.history} />
          </Card>
          {can(actor.user!.role, "personal_data.erase") && !h.personalDataErasedAt && (
            <Card>
              <h2 className="mb-2 text-lg font-semibold">Datenschutz</h2>
              <EraseButton endpoint={`/api/admin/hints/${h.id}/erase`} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
