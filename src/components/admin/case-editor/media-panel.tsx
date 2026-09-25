"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, type ApiError } from "@/lib/api-client";
import { COPYRIGHT_STATUSES, type CopyrightStatusValue, type ReviewStatusValue, type VisibilityValue } from "@/lib/enums";
import { COPYRIGHT_STATUS_LABELS, REVIEW_STATUS_LABELS } from "@/lib/labels";
import { Badge, Button } from "@/components/ui";
import { Field, FormError } from "@/components/ui/form";

type M = {
  id: string;
  title: string | null;
  sourceText: string | null;
  copyrightStatus: CopyrightStatusValue;
  visibility: VisibilityValue;
  reviewStatus: ReviewStatusValue;
  isPrimary: boolean;
  mediaType: string;
  width: number | null;
  height: number | null;
};

export function MediaPanel({ caseId, media, canManage }: { caseId: string; media: M[]; canManage: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(path: string, init: Parameters<typeof api>[1]) {
    setBusy(true);
    const res = await api(path, init);
    setBusy(false);
    setError(res.ok ? null : res.error);
    router.refresh();
    return res.ok;
  }

  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("caseId", caseId);
    if (await run("/api/media", { form: fd })) form.reset();
  }

  return (
    <div className="space-y-4">
      <FormError error={error} />
      {media.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {media.map((m) => {
            const isPublic = m.visibility === "PUBLIC" && m.reviewStatus === "APPROVED" && m.copyrightStatus !== "UNKNOWN";
            return (
              <li key={m.id} className="rounded-lg border border-line p-3 text-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/media/${m.id}/file?variant=thumb`} alt={m.title ?? "Bild"} loading="lazy" className="mb-2 h-48 w-full rounded object-cover bg-canvas" />
                <div className="flex flex-wrap gap-1">
                  <Badge tone={m.reviewStatus === "APPROVED" ? "found" : m.reviewStatus === "REJECTED" ? "danger" : "warn"}>{REVIEW_STATUS_LABELS[m.reviewStatus]}</Badge>
                  <Badge tone={isPublic ? "found" : "neutral"}>{isPublic ? "öffentlich" : "nicht öffentlich"}</Badge>
                  {m.isPrimary && <Badge tone="brand">Hauptbild</Badge>}
                </div>
                <p className="mt-1">{m.title ?? "Ohne Titel"}</p>
                <p className="text-xs text-muted">{COPYRIGHT_STATUS_LABELS[m.copyrightStatus]}{m.sourceText ? ` · ${m.sourceText}` : ""}</p>
                {canManage && (
                  <div className="mt-2 space-y-2">
                    <label className="sr-only" htmlFor={`cr-${m.id}`}>Urheberrecht</label>
                    <select id={`cr-${m.id}`} className="input py-1 text-sm" value={m.copyrightStatus} disabled={busy} onChange={(e) => run(`/api/admin/media/${m.id}`, { method: "PATCH", json: { copyrightStatus: e.target.value } })}>
                      {COPYRIGHT_STATUSES.map((c) => <option key={c} value={c}>{COPYRIGHT_STATUS_LABELS[c]}</option>)}
                    </select>
                    <div className="flex flex-wrap gap-1">
                      {m.reviewStatus !== "APPROVED" ? (
                        <Button className="min-h-[36px] py-1" disabled={busy} onClick={() => run(`/api/admin/media/${m.id}`, { method: "PATCH", json: { reviewStatus: "APPROVED", visibility: "PUBLIC" } })}>
                          Freigeben
                        </Button>
                      ) : (
                        <Button variant="secondary" className="min-h-[36px] py-1" disabled={busy} onClick={() => run(`/api/admin/media/${m.id}`, { method: "PATCH", json: { visibility: m.visibility === "PUBLIC" ? "INTERNAL" : "PUBLIC" } })}>
                          {m.visibility === "PUBLIC" ? "Verbergen" : "Öffentlich zeigen"}
                        </Button>
                      )}
                      {m.reviewStatus !== "REJECTED" && (
                        <Button variant="secondary" className="min-h-[36px] py-1" disabled={busy} onClick={() => run(`/api/admin/media/${m.id}`, { method: "PATCH", json: { reviewStatus: "REJECTED", visibility: "INTERNAL" } })}>
                          Ablehnen
                        </Button>
                      )}
                      {!m.isPrimary && (
                        <Button variant="ghost" className="min-h-[36px] py-1" disabled={busy} onClick={() => run(`/api/admin/media/${m.id}`, { method: "PATCH", json: { isPrimary: true } })}>
                          Als Hauptbild
                        </Button>
                      )}
                      <Button variant="ghost" className="min-h-[36px] py-1" disabled={busy} onClick={() => window.confirm("Bild endgültig löschen?") && run(`/api/admin/media/${m.id}`, { method: "DELETE" })}>
                        Löschen
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted">Keine Bilder.</p>
      )}
      {canManage && (
        <details className="rounded-lg border border-line p-3">
          <summary className="cursor-pointer text-sm font-semibold">Suchbild hochladen</summary>
          <p className="mt-2 text-xs text-muted">JPG, PNG oder WebP bis 8 MB. Das Bild wird neu kodiert (Metadaten entfernt) und ist zunächst nicht öffentlich.</p>
          <form onSubmit={upload} className="mt-3 grid gap-3 sm:grid-cols-2" noValidate encType="multipart/form-data">
            <Field label="Datei" required error={error?.details?.file} className="sm:col-span-2">{(p) => <input type="file" name="file" accept="image/jpeg,image/png,image/webp" className="input" required {...p} />}</Field>
            <Field label="Titel">{(p) => <input name="title" className="input" {...p} />}</Field>
            <Field label="Bildquelle / Urheber">{(p) => <input name="sourceText" className="input" {...p} />}</Field>
            <Field label="Urheberrecht" hint="„Ungeklärt“ verhindert eine Veröffentlichung">
              {(p) => <select name="copyrightStatus" className="input" defaultValue="UNKNOWN" {...p}>{COPYRIGHT_STATUSES.map((c) => <option key={c} value={c}>{COPYRIGHT_STATUS_LABELS[c]}</option>)}</select>}
            </Field>
            <input type="hidden" name="mediaType" value="SEARCH_IMAGE" />
            <div className="sm:col-span-2"><Button type="submit" variant="secondary" disabled={busy}>{busy ? "Lädt hoch …" : "Hochladen"}</Button></div>
          </form>
        </details>
      )}
    </div>
  );
}
