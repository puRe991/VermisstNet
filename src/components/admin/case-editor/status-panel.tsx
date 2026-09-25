"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, type ApiError } from "@/lib/api-client";
import { CASE_STATUSES, type CaseStatusValue, type PublicationStatusValue } from "@/lib/enums";
import { CASE_STATUS_LABELS, PUBLICATION_STATUS_LABELS } from "@/lib/labels";
import { canTransitionCase } from "@/lib/workflow";
import { Alert, Badge, Button } from "@/components/ui";
import { FormError } from "@/components/ui/form";

export function StatusPanel({
  caseId,
  status,
  isUrgent,
  publicationStatus,
  readiness,
  canStatus,
  canPublish,
}: {
  caseId: string;
  status: CaseStatusValue;
  isUrgent: boolean;
  publicationStatus: PublicationStatusValue;
  readiness: { ok: boolean; problems: string[] };
  canStatus: boolean;
  canPublish: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [next, setNext] = useState<CaseStatusValue>(status);
  const [note, setNote] = useState("");

  async function run(path: string, init: Parameters<typeof api>[1]) {
    setBusy(true);
    setError(null);
    const res = await api(path, init);
    setBusy(false);
    if (!res.ok) setError(res.error);
    router.refresh();
  }

  return (
    <div className="space-y-4 text-sm">
      <FormError error={error} />
      <div className="flex flex-wrap gap-2">
        <Badge tone={publicationStatus === "PUBLISHED" ? "found" : "neutral"}>{PUBLICATION_STATUS_LABELS[publicationStatus]}</Badge>
        <Badge tone="brand">{CASE_STATUS_LABELS[status]}</Badge>
        {isUrgent && <Badge tone="urgent">Dringend</Badge>}
      </div>

      {canPublish && (
        <div className="space-y-2">
          {publicationStatus !== "PUBLISHED" ? (
            <>
              {!readiness.ok && (
                <Alert tone="warn" title="Veröffentlichung noch nicht möglich">
                  <ul className="list-disc pl-4">{readiness.problems.map((p) => <li key={p}>{p}</li>)}</ul>
                </Alert>
              )}
              <Button disabled={busy || !readiness.ok} onClick={() => window.confirm("Fall jetzt öffentlich machen?") && run(`/api/admin/cases/${caseId}/publish`, { method: "POST" })}>
                Veröffentlichen
              </Button>
            </>
          ) : (
            <Button variant="secondary" disabled={busy} onClick={() => window.confirm("Fall von der öffentlichen Seite zurückziehen?") && run(`/api/admin/cases/${caseId}/unpublish`, { method: "POST", json: {} })}>
              Veröffentlichung zurückziehen
            </Button>
          )}
        </div>
      )}

      {canStatus && (
        <div className="space-y-2 border-t border-line pt-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isUrgent}
              disabled={busy || status !== "ACTIVE"}
              onChange={(e) => run(`/api/admin/cases/${caseId}`, { method: "PATCH", json: { isUrgent: e.target.checked } })}
            />
            Als dringend (URGENT) kennzeichnen
          </label>
          <label htmlFor="status-next" className="block font-semibold">Status ändern</label>
          <select id="status-next" className="input" value={next} onChange={(e) => setNext(e.target.value as CaseStatusValue)}>
            {CASE_STATUSES.filter((s) => canTransitionCase(status, s)).map((s) => (
              <option key={s} value={s}>{CASE_STATUS_LABELS[s]}</option>
            ))}
          </select>
          <input className="input" placeholder="Notiz zum Statuswechsel (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
          <Button
            variant="secondary"
            disabled={busy || next === status}
            onClick={() => window.confirm(`Status auf „${CASE_STATUS_LABELS[next]}“ ändern?`) && run(`/api/admin/cases/${caseId}`, { method: "PATCH", json: { status: next, statusNote: note || undefined } })}
          >
            Status übernehmen
          </Button>
          <p className="text-xs text-muted">„Gefunden“ entfernt Bilder, Beschreibung und Orte automatisch von der öffentlichen Seite. „Archiviert“ macht den Fall unsichtbar.</p>
        </div>
      )}
    </div>
  );
}
