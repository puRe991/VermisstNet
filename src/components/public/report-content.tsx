"use client";

import { useState } from "react";
import { api, type ApiError } from "@/lib/api-client";
import { REPORT_REASONS } from "@/lib/enums";
import { REPORT_REASON_LABELS } from "@/lib/labels";
import { Alert, Button } from "@/components/ui";
import { Field, FormError, Honeypot } from "@/components/ui/form";

export function ReportContent({ publicNumber }: { publicNumber: string }) {
  const [error, setError] = useState<ApiError | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await api(`/api/cases/${publicNumber}/reports`, { json: Object.fromEntries(fd.entries()) });
    setBusy(false);
    if (res.ok) setDone(true);
    else setError(res.error);
  }

  if (done) return <Alert tone="found" title="Vielen Dank. Ihre Meldung wird vom Moderationsteam geprüft." />;

  return (
    <details className="rounded-xl border border-line bg-surface p-4">
      <summary className="cursor-pointer text-sm font-semibold">Inhalt melden (z. B. falsche Angaben, Datenschutz, Person gefunden)</summary>
      <form onSubmit={onSubmit} className="relative mt-4 space-y-3" noValidate>
        <FormError error={error} />
        <Field label="Grund" required error={error?.details?.reason}>
          {(p) => (
            <select name="reason" className="input" required {...p}>
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>{REPORT_REASON_LABELS[r]}</option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Nachricht" required error={error?.details?.message}>
          {(p) => <textarea name="message" rows={3} maxLength={3000} className="input" required {...p} />}
        </Field>
        <Field label="Kontakt für Rückfragen (optional)" error={error?.details?.contact} hint="Wird verschlüsselt gespeichert und nur vom Moderationsteam eingesehen.">
          {(p) => <input name="contact" maxLength={300} className="input" {...p} />}
        </Field>
        <Honeypot />
        <Button type="submit" variant="secondary" disabled={busy}>{busy ? "Wird gesendet …" : "Meldung senden"}</Button>
      </form>
    </details>
  );
}
