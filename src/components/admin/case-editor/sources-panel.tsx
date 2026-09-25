"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, type ApiError } from "@/lib/api-client";
import { SOURCE_TYPES, type SourceTypeValue } from "@/lib/enums";
import { formatDate, formatDateTime } from "@/lib/format";
import { SOURCE_TYPE_LABELS } from "@/lib/labels";
import { Badge, Button } from "@/components/ui";
import { Field, FormError } from "@/components/ui/form";
import { SourceVerifyButtons } from "./source-actions";
import { formToJson } from "./util";

type Source = {
  id: string;
  sourceType: SourceTypeValue;
  organization: string | null;
  title: string;
  url: string | null;
  publicationDate: Date | null;
  verifiedAt: Date | null;
  notes: string | null;
  verifiedBy: { displayName: string } | null;
};

export function SourcesPanel({ caseId, sources, canCreate, canVerify, canDelete }: { caseId: string; sources: Source[]; canCreate: boolean; canVerify: boolean; canDelete: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<ApiError | null>(null);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const res = await api(`/api/admin/cases/${caseId}/sources`, { json: formToJson(form) });
    if (!res.ok) return setError(res.error);
    setError(null);
    form.reset();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {sources.length ? (
        <ul className="space-y-3">
          {sources.map((s) => (
            <li key={s.id} className="rounded-lg border border-line p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{s.title}</p>
                {s.verifiedAt ? <Badge tone="found">verifiziert</Badge> : <Badge tone="warn">ungeprüft</Badge>}
              </div>
              <p className="text-muted">
                {SOURCE_TYPE_LABELS[s.sourceType]}{s.organization ? ` · ${s.organization}` : ""}{s.publicationDate ? ` · ${formatDate(s.publicationDate)}` : ""}
                {s.verifiedAt ? ` · geprüft ${formatDateTime(s.verifiedAt)}${s.verifiedBy ? ` von ${s.verifiedBy.displayName}` : ""}` : ""}
              </p>
              {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="break-all">{s.url}</a>}
              {s.notes && <p className="mt-1 whitespace-pre-line text-muted">Intern: {s.notes}</p>}
              {canVerify && <div className="mt-2"><SourceVerifyButtons id={s.id} verified={!!s.verifiedAt} canDelete={canDelete} /></div>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Noch keine Quellen.</p>
      )}
      {canCreate && (
        <details className="rounded-lg border border-line p-3">
          <summary className="cursor-pointer text-sm font-semibold">Quelle hinzufügen</summary>
          <form onSubmit={add} className="mt-3 grid gap-3 sm:grid-cols-2" noValidate>
            <div className="sm:col-span-2"><FormError error={error} /></div>
            <Field label="Typ" required>
              {(p) => <select name="sourceType" className="input" defaultValue="POLICE" {...p}>{SOURCE_TYPES.map((t) => <option key={t} value={t}>{SOURCE_TYPE_LABELS[t]}</option>)}</select>}
            </Field>
            <Field label="Organisation" error={error?.details?.organization}>{(p) => <input name="organization" className="input" {...p} />}</Field>
            <Field label="Titel" required error={error?.details?.title}>{(p) => <input name="title" className="input" {...p} />}</Field>
            <Field label="URL" error={error?.details?.url}>{(p) => <input name="url" type="url" className="input" placeholder="https://" {...p} />}</Field>
            <Field label="Veröffentlichungsdatum" error={error?.details?.publicationDate}>{(p) => <input name="publicationDate" type="date" className="input" {...p} />}</Field>
            <Field label="Interne Notiz" error={error?.details?.notes}>{(p) => <input name="notes" className="input" {...p} />}</Field>
            <div className="sm:col-span-2"><Button type="submit" variant="secondary">Quelle speichern</Button></div>
          </form>
        </details>
      )}
    </div>
  );
}
