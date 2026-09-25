import Link from "next/link";
import { Attachments } from "@/components/admin/attachments";
import { DecisionPanel } from "@/components/admin/decision-panel";
import { EraseButton } from "@/components/admin/erase-button";
import { guard } from "@/components/admin/guard";
import { History } from "@/components/admin/history";
import { Alert, Badge, Card, DefinitionList, PageHeader } from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/format";
import { DECISION_LABELS, GENDER_LABELS, SUBMISSION_STATUS_LABELS } from "@/lib/labels";
import { can } from "@/lib/permissions";
import { SUBMISSION_TERMINAL } from "@/lib/workflow";
import { getActor } from "@/server/auth/actor";
import { uuidParam } from "@/server/http";
import { getSubmission } from "@/server/services/moderation";

const NEXT_STEP: Record<string, string> = {
  SUBMITTED: "In Prüfung nehmen",
  REVIEW: "Zur Quellenprüfung",
  SOURCE_VERIFICATION: "Freigeben (Fallentwurf anlegen)",
};

export default async function SubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getActor();
  const s = await guard(async () => getSubmission(actor, uuidParam(id)));
  const terminal = SUBMISSION_TERMINAL.includes(s.status);

  return (
    <div className="space-y-6">
      <PageHeader title={`Meldung ${s.referenceCode}`} lead={`${s.personName} · eingegangen ${formatDateTime(s.createdAt)}`}>
        <Badge tone="brand">{SUBMISSION_STATUS_LABELS[s.status]}</Badge>
        {s.lastDecision && <Badge>Letzte Entscheidung: {DECISION_LABELS[s.lastDecision]}</Badge>}
      </PageHeader>
      {s.case && (
        <Alert tone="found" title={`Fallentwurf ${s.case.publicNumber} angelegt`}>
          <Link href={`/admin/faelle/${s.case.id}`}>Fall bearbeiten und nach Quellenprüfung veröffentlichen →</Link>
        </Alert>
      )}
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 text-lg font-semibold">Angaben</h2>
            <DefinitionList
              items={[
                { label: "Name", value: s.personName },
                { label: "Alter", value: s.age },
                { label: "Geschlecht", value: GENDER_LABELS[s.gender] },
                { label: "Vermisst seit", value: formatDate(s.missingSince) },
                { label: "Vermisstenort", value: s.missingPlace },
                { label: "Beschreibung", value: s.description },
                { label: "Bekannte Umstände", value: s.circumstances },
                { label: "Quelle", value: s.sourceText },
                { label: "Quellen-Link", value: s.sourceUrl ? <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">{s.sourceUrl}</a> : null },
                { label: "Kontakt", value: s.contact ?? (s.personalDataErasedAt ? "gelöscht" : "keine Angabe") },
                { label: "Konto", value: s.reporter ? `${s.reporter.displayName} (${s.reporter.email})` : null },
              ]}
            />
          </Card>
          <Card>
            <h2 className="mb-3 text-lg font-semibold">Suchbild</h2>
            <Attachments items={s.attachments} />
          </Card>
          <Card>
            <h2 className="mb-3 text-lg font-semibold">Ursprüngliche Eingabe (unverändert)</h2>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-canvas p-3 text-xs">{JSON.stringify(s.originalPayload, null, 2)}</pre>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 text-lg font-semibold">Entscheidung</h2>
            {terminal ? (
              <p className="text-sm text-muted">Diese Meldung ist abgeschlossen ({SUBMISSION_STATUS_LABELS[s.status]}).</p>
            ) : (
              <DecisionPanel
                endpoint={`/api/admin/submissions/${s.id}`}
                decisions={["CONFIRM", "DEFER", "REQUEST_INFO", "REJECT", "FORWARD"]}
                confirmLabel={NEXT_STEP[s.status]}
              />
            )}
          </Card>
          <Card>
            <h2 className="mb-3 text-lg font-semibold">Bearbeitungsverlauf</h2>
            <History events={s.history} />
          </Card>
          {can(actor.user!.role, "personal_data.erase") && !s.personalDataErasedAt && (
            <Card>
              <h2 className="mb-2 text-lg font-semibold">Datenschutz</h2>
              <EraseButton endpoint={`/api/admin/submissions/${s.id}/erase`} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
